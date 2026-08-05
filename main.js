'use strict';

const utils = require('@iobroker/adapter-core');
const { SerialPort } = require('serialport');
const { isChannelSubscribed, normalizeHex, parseSubscribedChannels, slugifySegment } = require('./lib/meshcore-utils');

class Meshcore extends utils.Adapter {
	constructor(options) {
		super({
			...options,
			name: 'meshcore',
		});

		this.meshcoreLib = null;
		this.meshConnection = null;
		this.meshConstants = null;
		this.connectionReady = false;
		this.reconnectTimeout = null;
		this.messagePollInterval = null;
		this.statsInterval = null;
		this.operationChain = Promise.resolve();
		this.channelCache = new Map();
		this.contactCache = new Map();
		this.subscribedChannelConfig = parseSubscribedChannels([]);
		this.maxHistoryEntries = 50;
		this.connectAttemptId = 0;

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	async onReady() {
		this.connectionReady = false;
		this.subscribedChannelConfig = parseSubscribedChannels(this.config.subscribedChannels);
		this.maxHistoryEntries = Math.max(1, Number(this.config.maxHistoryEntries) || 50);

		await this.ensureBaseObjects();
		await this.setStateAsync('info.connection', { val: false, ack: true });
		await this.setStateAsync('info.lastError', { val: '', ack: true });
		await this.setStateAsync('info.configuredPort', { val: this.config.serialPort || '', ack: true });
		await this.updateDynamicTargetsStates();

		this.subscribeStates('commands.*');

		await this.loadMeshCoreLibrary();
		await this.connectMeshCore();
	}

	async loadMeshCoreLibrary() {
		if (!this.meshcoreLib) {
			this.meshcoreLib = await import('@liamcottle/meshcore.js');
			this.meshConstants = this.meshcoreLib.Constants;
		}
	}

	async ensureBaseObjects() {
		await this.extendObjectAsync('info.lastError', {
			type: 'state',
			common: {
				name: 'Last error',
				type: 'string',
				role: 'text',
				read: true,
				write: false,
				def: '',
			},
			native: {},
		});
		await this.extendObjectAsync('info.lastConnect', {
			type: 'state',
			common: {
				name: 'Last successful connect',
				type: 'string',
				role: 'date',
				read: true,
				write: false,
				def: '',
			},
			native: {},
		});
		await this.extendObjectAsync('info.lastSync', {
			type: 'state',
			common: {
				name: 'Last metadata sync',
				type: 'string',
				role: 'date',
				read: true,
				write: false,
				def: '',
			},
			native: {},
		});
		await this.extendObjectAsync('info.configuredPort', {
			type: 'state',
			common: {
				name: 'Configured serial port',
				type: 'string',
				role: 'text',
				read: true,
				write: false,
				def: '',
			},
			native: {},
		});
		await this.extendObjectAsync('meta.self', this.jsonStateObject('Self info'));
		await this.extendObjectAsync('meta.device', this.jsonStateObject('Device info'));
		await this.extendObjectAsync('meta.contacts', this.jsonStateObject('Contacts'));
		await this.extendObjectAsync('meta.channels', this.jsonStateObject('Channels'));
		await this.extendObjectAsync('meta.stats.core', this.jsonStateObject('Core stats'));
		await this.extendObjectAsync('meta.stats.radio', this.jsonStateObject('Radio stats'));
		await this.extendObjectAsync('meta.stats.packets', this.jsonStateObject('Packet stats'));
		await this.extendObjectAsync('commands.public.message', this.writableStringState('Public message text'));
		await this.extendObjectAsync('commands.public.send', this.buttonState('Send public message'));
		await this.extendObjectAsync('commands.channel.target', this.writableStringState('Channel target'));
		await this.extendObjectAsync('commands.channel.message', this.writableStringState('Channel message text'));
		await this.extendObjectAsync('commands.channel.send', this.buttonState('Send channel message'));
		await this.extendObjectAsync('commands.private.target', this.writableStringState('Private target'));
		await this.extendObjectAsync('commands.private.message', this.writableStringState('Private message text'));
		await this.extendObjectAsync('commands.private.send', this.buttonState('Send private message'));
		await this.extendObjectAsync('commands.availableContacts', this.jsonStateObject('Available private targets'));
		await this.extendObjectAsync('commands.availableChannels', this.jsonStateObject('Available channel targets'));
	}

	/**
	 * @param {string} name Display name of the JSON state.
	 * @returns {ioBroker.SettableStateObject} JSON-encoded readonly state object.
	 */
	jsonStateObject(name) {
		return {
			type: 'state',
			common: {
				name,
				type: 'string',
				role: 'json',
				read: true,
				write: false,
				def: '[]',
			},
			native: {},
		};
	}

	/**
	 * @param {string} name Display name of the writable text state.
	 * @returns {ioBroker.SettableStateObject} Writable text state object.
	 */
	writableStringState(name) {
		return {
			type: 'state',
			common: {
				name,
				type: 'string',
				role: 'text',
				read: true,
				write: true,
				def: '',
			},
			native: {},
		};
	}

	/**
	 * @param {string} name Display name of the trigger state.
	 * @returns {ioBroker.SettableStateObject} Writable button state object.
	 */
	buttonState(name) {
		return {
			type: 'state',
			common: {
				name,
				type: 'boolean',
				role: 'button',
				read: false,
				write: true,
				def: false,
			},
			native: {},
		};
	}

	/**
	 * @param {string} name Display name of the numeric state.
	 * @returns {ioBroker.SettableStateObject} Readonly numeric state object.
	 */
	readonlyNumberState(name) {
		return {
			type: 'state',
			common: {
				name,
				type: 'number',
				role: 'value',
				read: true,
				write: false,
				def: 0,
			},
			native: {},
		};
	}

	/**
	 * @param {string} name Display name of the channel object.
	 * @returns {ioBroker.SettableChannelObject} Channel object definition.
	 */
	channelObject(name) {
		return {
			type: 'channel',
			common: {
				name,
			},
			native: {},
		};
	}

	queueOperation(task) {
		const run = async () => task();
		const operation = this.operationChain.then(run, run);
		this.operationChain = operation.catch(() => undefined);
		return operation;
	}

	scheduleReconnect(reason) {
		if (this.reconnectTimeout) {
			return;
		}

		const delay = Math.max(5, Number(this.config.reconnectDelaySeconds) || 15) * 1000;
		this.log.info(`Reconnecting to MeshCore in ${delay / 1000}s (${reason})`);
		this.reconnectTimeout = setTimeout(async () => {
			this.reconnectTimeout = null;
			await this.connectMeshCore();
		}, delay);
	}

	async connectMeshCore() {
		if (!this.config.serialPort) {
			await this.setStateAsync('info.lastError', {
				val: 'No serial port configured',
				ack: true,
			});
			this.log.warn('No serial port configured. Select one in the admin configuration.');
			return;
		}

		await this.closeCurrentConnection();

		try {
			const attemptId = ++this.connectAttemptId;
			const { NodeJSSerialConnection } = this.meshcoreLib;
			const connection = new NodeJSSerialConnection(this.config.serialPort);
			this.meshConnection = connection;

			connection.on('connected', () => {
				void this.queueOperation(() => this.handleConnected(connection));
			});
			connection.on('disconnected', () => {
				void this.handleDisconnected('serial connection closed');
			});
			connection.on(this.meshConstants.PushCodes.MsgWaiting, () => {
				void this.queueOperation(() => this.pullWaitingMessages());
			});
			connection.on(this.meshConstants.PushCodes.NewAdvert, advert => {
				void this.queueOperation(() => this.upsertContact(advert));
			});

			await connection.connect();
			await this.waitForSerialReady(connection, attemptId);
		} catch (error) {
			await this.handleConnectionError(error);
		}
	}

	async waitForSerialReady(connection, attemptId) {
		await new Promise((resolve, reject) => {
			const timeoutMs = 10000;
			let done = false;

			const finish = (callback, value) => {
				if (done) {
					return;
				}
				done = true;
				clearTimeout(timeout);
				if (connection?.serialPort) {
					connection.serialPort.off('open', onOpen);
					connection.serialPort.off('error', onError);
					connection.serialPort.off('close', onCloseBeforeOpen);
				}
				callback(value);
			};

			const onOpen = () => finish(resolve);
			const onError = error => finish(reject, error);
			const onCloseBeforeOpen = () =>
				finish(reject, new Error('Serial port closed before MeshCore became ready'));
			const timeout = setTimeout(() => {
				finish(
					reject,
					new Error(`Timed out after ${timeoutMs}ms while opening serial port ${this.config.serialPort}`),
				);
			}, timeoutMs);

			if (!connection?.serialPort) {
				finish(reject, new Error('MeshCore serial port object was not created'));
				return;
			}

			connection.serialPort.once('open', onOpen);
			connection.serialPort.once('error', onError);
			connection.serialPort.once('close', onCloseBeforeOpen);

			if (connection.serialPort.isOpen) {
				finish(resolve);
				return;
			}

			if (attemptId !== this.connectAttemptId) {
				finish(reject, new Error('Superseded by a newer connection attempt'));
			}
		});
	}

	async handleConnected(connection) {
		if (connection !== this.meshConnection) {
			return;
		}

		this.log.info(`MeshCore serial connection opened on ${this.config.serialPort}`);
		this.connectionReady = true;
		await this.setStateAsync('info.connection', { val: true, ack: true });
		await this.setStateAsync('info.lastError', { val: '', ack: true });
		await this.setStateAsync('info.lastConnect', {
			val: new Date().toISOString(),
			ack: true,
		});

		await this.initialSync();
		this.startIntervals();
	}

	async initialSync() {
		if (!this.meshConnection) {
			return;
		}

		if (this.config.syncTimeOnConnect) {
			await this.meshConnection.syncDeviceTime();
		}

		const selfInfo = await this.meshConnection.getSelfInfo();
		const deviceInfo = await this.meshConnection.deviceQuery(this.meshConstants.SupportedCompanionProtocolVersion);
		const contacts = await this.meshConnection.getContacts();
		const channels = await this.meshConnection.getChannels();

		await this.storeSelfInfo(selfInfo);
		await this.storeDeviceInfo(deviceInfo);
		await this.storeContacts(contacts);
		await this.storeChannels(channels);
		await this.refreshStats();
		await this.pullWaitingMessages();
		await this.setStateAsync('info.lastSync', {
			val: new Date().toISOString(),
			ack: true,
		});
		await this.updateDynamicTargetsStates();
	}

	startIntervals() {
		this.stopIntervals();

		const pollSeconds = Math.max(0, Number(this.config.messagePollIntervalSeconds) || 0);
		if (pollSeconds > 0) {
			this.messagePollInterval = setInterval(() => {
				void this.queueOperation(() => this.pullWaitingMessages());
			}, pollSeconds * 1000);
		}

		const statsMinutes = Math.max(0, Number(this.config.statsRefreshMinutes) || 0);
		if (statsMinutes > 0) {
			this.statsInterval = setInterval(
				() => {
					void this.queueOperation(() => this.refreshStats());
				},
				statsMinutes * 60 * 1000,
			);
		}
	}

	stopIntervals() {
		if (this.messagePollInterval) {
			clearInterval(this.messagePollInterval);
			this.messagePollInterval = null;
		}

		if (this.statsInterval) {
			clearInterval(this.statsInterval);
			this.statsInterval = null;
		}
	}

	async handleDisconnected(reason) {
		this.connectionReady = false;
		this.stopIntervals();
		this.log.warn(`MeshCore disconnected: ${reason}`);
		await this.setStateAsync('info.connection', { val: false, ack: true });
		await this.setStateAsync('info.lastError', { val: reason, ack: true });
		this.scheduleReconnect(reason);
	}

	async handleConnectionError(error) {
		this.connectionReady = false;
		const message = error?.message || String(error);
		this.log.error(`MeshCore connect failed: ${message}`);
		await this.setStateAsync('info.connection', { val: false, ack: true });
		await this.setStateAsync('info.lastError', { val: message, ack: true });
		this.scheduleReconnect('connect failed');
	}

	async closeCurrentConnection() {
		this.connectionReady = false;
		this.stopIntervals();

		if (!this.meshConnection) {
			return;
		}

		const connection = this.meshConnection;
		this.meshConnection = null;

		try {
			await connection.close();
		} catch (error) {
			this.log.debug(`Ignoring close error: ${error?.message || error}`);
		}
	}

	async refreshStats() {
		if (!this.meshConnection || !this.connectionReady) {
			return;
		}

		const [coreStats, radioStats, packetStats, battery] = await Promise.all([
			this.meshConnection.getCoreStats(),
			this.meshConnection.getRadioStats(),
			this.meshConnection.getPacketStats(),
			this.meshConnection.getBatteryVoltage(),
		]);

		coreStats.data.batteryMilliVolts = battery.batteryMilliVolts;
		await this.setJsonState('meta.stats.core', coreStats.data);
		await this.setJsonState('meta.stats.radio', radioStats.data);
		await this.setJsonState('meta.stats.packets', packetStats.data);
	}

	async storeSelfInfo(selfInfo) {
		await this.setJsonState('meta.self', selfInfo);
	}

	async storeDeviceInfo(deviceInfo) {
		await this.setJsonState('meta.device', deviceInfo);
	}

	async storeContacts(contacts) {
		this.contactCache.clear();
		for (const contact of contacts) {
			this.contactCache.set(normalizeHex(contact.publicKey), contact);
			await this.upsertContact(contact);
		}

		await this.setJsonState(
			'meta.contacts',
			contacts.map(contact => this.contactSummary(contact)),
		);
	}

	async upsertContact(contact) {
		const fullHex = normalizeHex(contact.publicKey);
		this.contactCache.set(fullHex, contact);

		const prefix = fullHex.slice(0, 12);
		const branch = `private.pk_${prefix}`;
		await this.extendObjectAsync(branch, this.channelObject(contact.advName || prefix));
		await this.extendObjectAsync(`${branch}.meta`, this.jsonStateObject('Contact metadata'));
		await this.extendObjectAsync(`${branch}.messages.last`, this.jsonStateObject('Last message'));
		await this.extendObjectAsync(`${branch}.messages.history`, this.jsonStateObject('Message history'));
		await this.extendObjectAsync(`${branch}.messages.count`, this.readonlyNumberState('Message count'));
		await this.setJsonState(`${branch}.meta`, this.contactSummary(contact));
	}

	contactSummary(contact) {
		return {
			name: contact.advName || '',
			publicKey: normalizeHex(contact.publicKey),
			type: contact.type,
			flags: contact.flags,
			lastAdvert: contact.lastAdvert,
			lastMod: contact.lastMod,
			advLat: contact.advLat,
			advLon: contact.advLon,
			outPathLen: contact.outPathLen,
		};
	}

	async storeChannels(channels) {
		this.channelCache.clear();
		for (const channel of channels) {
			this.channelCache.set(channel.channelIdx, channel);
			await this.ensureChannelBranch(channel);
		}

		await this.setJsonState(
			'meta.channels',
			channels.map(channel => ({
				channelIdx: channel.channelIdx,
				name: channel.name,
				secret: normalizeHex(channel.secret),
				subscribed: isChannelSubscribed(this.subscribedChannelConfig, channel),
			})),
		);
	}

	async ensureChannelBranch(channel) {
		const branch = this.getChannelBranch(channel);
		await this.extendObjectAsync(branch, this.channelObject(channel.name || `Channel ${channel.channelIdx}`));
		await this.extendObjectAsync(`${branch}.meta`, this.jsonStateObject('Channel metadata'));
		await this.extendObjectAsync(`${branch}.messages.last`, this.jsonStateObject('Last message'));
		await this.extendObjectAsync(`${branch}.messages.history`, this.jsonStateObject('Message history'));
		await this.extendObjectAsync(`${branch}.messages.count`, this.readonlyNumberState('Message count'));
		await this.setJsonState(`${branch}.meta`, {
			channelIdx: channel.channelIdx,
			name: channel.name,
			secret: normalizeHex(channel.secret),
			subscribed: isChannelSubscribed(this.subscribedChannelConfig, channel),
		});
	}

	getChannelBranch(channel) {
		if (channel.channelIdx === 0) {
			return 'channels.public';
		}

		return `channels.ch${channel.channelIdx}_${slugifySegment(channel.name || `channel_${channel.channelIdx}`)}`;
	}

	async pullWaitingMessages() {
		if (!this.meshConnection || !this.connectionReady) {
			return;
		}

		const waitingMessages = await this.meshConnection.getWaitingMessages();
		for (const waitingMessage of waitingMessages) {
			if (waitingMessage.contactMessage) {
				await this.handleIncomingPrivateMessage(waitingMessage.contactMessage);
			} else if (waitingMessage.channelMessage) {
				await this.handleIncomingChannelMessage(waitingMessage.channelMessage);
			}
		}
	}

	async handleIncomingPrivateMessage(message) {
		const prefixHex = normalizeHex(message.pubKeyPrefix);
		const contact = this.findContactByPrefix(prefixHex);
		const branch = `private.pk_${prefixHex}`;

		await this.extendObjectAsync(branch, this.channelObject(contact?.advName || prefixHex));

		const entry = {
			direction: 'incoming',
			receivedAt: new Date().toISOString(),
			senderTimestamp: message.senderTimestamp,
			pubKeyPrefix: prefixHex,
			contactName: contact?.advName || '',
			text: message.text,
			txtType: message.txtType,
			pathLen: message.pathLen,
		};

		await this.appendHistory(`${branch}.messages`, entry);
	}

	async handleIncomingChannelMessage(message) {
		if (message.channelIdx === 0 && this.config.monitorPublicChannel === false) {
			return;
		}

		const channel = this.channelCache.get(message.channelIdx) || {
			channelIdx: message.channelIdx,
			name: `Channel ${message.channelIdx}`,
			secret: new Uint8Array(),
		};
		this.channelCache.set(channel.channelIdx, channel);

		if (!isChannelSubscribed(this.subscribedChannelConfig, channel)) {
			return;
		}

		await this.ensureChannelBranch(channel);

		const entry = {
			direction: 'incoming',
			receivedAt: new Date().toISOString(),
			senderTimestamp: message.senderTimestamp,
			channelIdx: message.channelIdx,
			channelName: channel.name,
			text: message.text,
			txtType: message.txtType,
			pathLen: message.pathLen,
		};

		await this.appendHistory(`${this.getChannelBranch(channel)}.messages`, entry);
	}

	findContactByPrefix(prefixHex) {
		for (const [publicKey, contact] of this.contactCache.entries()) {
			if (publicKey.startsWith(prefixHex)) {
				return contact;
			}
		}

		return null;
	}

	async appendHistory(baseId, entry) {
		await this.extendObjectAsync(`${baseId}.last`, this.jsonStateObject('Last message'));
		await this.extendObjectAsync(`${baseId}.history`, this.jsonStateObject('Message history'));
		await this.extendObjectAsync(`${baseId}.count`, this.readonlyNumberState('Message count'));

		const state = await this.getStateAsync(`${baseId}.history`);
		let history = [];
		if (state?.val) {
			try {
				history = JSON.parse(String(state.val));
			} catch {
				history = [];
			}
		}

		history.push(entry);
		history = history.slice(-this.maxHistoryEntries);

		await this.setJsonState(`${baseId}.last`, entry);
		await this.setJsonState(`${baseId}.history`, history);
		await this.setStateAsync(`${baseId}.count`, {
			val: history.length,
			ack: true,
		});
	}

	async setJsonState(id, value) {
		await this.setStateAsync(id, {
			val: JSON.stringify(value),
			ack: true,
		});
	}

	async updateDynamicTargetsStates() {
		const contacts = [...this.contactCache.values()].map(contact => ({
			label: `${contact.advName || '(unnamed)'} [${normalizeHex(contact.publicKey).slice(0, 12)}]`,
			value: normalizeHex(contact.publicKey),
		}));
		const channels = [...this.channelCache.values()].map(channel => ({
			label: `${channel.channelIdx}: ${channel.name}`,
			value: String(channel.channelIdx),
		}));

		await this.setJsonState('commands.availableContacts', contacts);
		await this.setJsonState('commands.availableChannels', channels);
	}

	async onStateChange(id, state) {
		if (!state || state.ack) {
			return;
		}

		try {
			if (id === `${this.namespace}.commands.public.send` && state.val) {
				await this.queueOperation(() => this.sendPublicMessage());
				await this.setStateAsync('commands.public.send', { val: false, ack: true });
			}

			if (id === `${this.namespace}.commands.channel.send` && state.val) {
				await this.queueOperation(() => this.sendConfiguredChannelMessage());
				await this.setStateAsync('commands.channel.send', { val: false, ack: true });
			}

			if (id === `${this.namespace}.commands.private.send` && state.val) {
				await this.queueOperation(() => this.sendConfiguredPrivateMessage());
				await this.setStateAsync('commands.private.send', { val: false, ack: true });
			}
		} catch (error) {
			const message = error?.message || String(error);
			this.log.warn(`Command failed for ${id}: ${message}`);
			await this.setStateAsync('info.lastError', { val: message, ack: true });
		}
	}

	async sendPublicMessage() {
		await this.ensureConnected();
		const state = await this.getStateAsync('commands.public.message');
		const text = String(state?.val || '').trim();
		if (!text) {
			throw new Error('Public message is empty');
		}

		await this.meshConnection.sendChannelTextMessage(0, text);
		await this.appendHistory('channels.public.messages', {
			direction: 'outgoing',
			receivedAt: new Date().toISOString(),
			channelIdx: 0,
			channelName: 'Public',
			text,
		});
	}

	async sendConfiguredChannelMessage() {
		await this.ensureConnected();

		const [targetState, messageState] = await Promise.all([
			this.getStateAsync('commands.channel.target'),
			this.getStateAsync('commands.channel.message'),
		]);

		const text = String(messageState?.val || '').trim();
		if (!text) {
			throw new Error('Channel message is empty');
		}

		const channel = await this.resolveChannelTarget(String(targetState?.val || '').trim());
		if (!channel) {
			throw new Error('Configured channel target not found');
		}

		await this.meshConnection.sendChannelTextMessage(channel.channelIdx, text);
		await this.appendHistory(`${this.getChannelBranch(channel)}.messages`, {
			direction: 'outgoing',
			receivedAt: new Date().toISOString(),
			channelIdx: channel.channelIdx,
			channelName: channel.name,
			text,
		});
	}

	async sendConfiguredPrivateMessage() {
		await this.ensureConnected();

		const [targetState, messageState] = await Promise.all([
			this.getStateAsync('commands.private.target'),
			this.getStateAsync('commands.private.message'),
		]);

		const text = String(messageState?.val || '').trim();
		if (!text) {
			throw new Error('Private message is empty');
		}

		const contact = await this.resolveContactTarget(String(targetState?.val || '').trim());
		if (!contact) {
			throw new Error('Configured private target not found');
		}

		await this.meshConnection.sendTextMessage(contact.publicKey, text);
		await this.handleOutgoingPrivateMessage(contact, text);
	}

	async handleOutgoingPrivateMessage(contact, text) {
		const branch = `private.pk_${normalizeHex(contact.publicKey).slice(0, 12)}`;
		await this.appendHistory(`${branch}.messages`, {
			direction: 'outgoing',
			receivedAt: new Date().toISOString(),
			pubKeyPrefix: normalizeHex(contact.publicKey).slice(0, 12),
			contactName: contact.advName || '',
			text,
		});
	}

	async resolveChannelTarget(value) {
		if (!value) {
			return null;
		}

		if (/^\d+$/.test(value)) {
			return this.channelCache.get(Number(value)) || null;
		}

		for (const channel of this.channelCache.values()) {
			if (channel.name === value) {
				return channel;
			}
		}

		return null;
	}

	async resolveContactTarget(value) {
		const normalized = normalizeHex(value);
		if (!normalized && !value) {
			return null;
		}

		for (const [publicKey, contact] of this.contactCache.entries()) {
			if (normalized && publicKey.startsWith(normalized)) {
				return contact;
			}
			if (contact.advName === value) {
				return contact;
			}
		}

		return null;
	}

	async ensureConnected() {
		if (!this.meshConnection || !this.connectionReady) {
			throw new Error('MeshCore is not connected');
		}
	}

	async onMessage(obj) {
		if (!obj || !obj.command) {
			return;
		}

		try {
			if (obj.command === 'listSerialPorts') {
				const ports = await SerialPort.list();
				const result = ports.map(port => ({
					label: `${port.path}${port.manufacturer ? ` - ${port.manufacturer}` : ''}`,
					value: port.path,
				}));
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, result, obj.callback);
				}
				return;
			}

			if (obj.command === 'listKnownChannels') {
				const result = [...this.channelCache.values()].map(channel => ({
					label: `${channel.channelIdx}: ${channel.name}`,
					value: String(channel.channelIdx),
				}));
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, result, obj.callback);
				}
				return;
			}

			if (obj.command === 'listContactTargets') {
				const result = [...this.contactCache.values()].map(contact => ({
					label: `${contact.advName || '(unnamed)'} [${normalizeHex(contact.publicKey).slice(0, 12)}]`,
					value: normalizeHex(contact.publicKey),
				}));
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, result, obj.callback);
				}
			}
		} catch (error) {
			this.log.warn(`Message command ${obj.command} failed: ${error?.message || error}`);
			if (obj.callback) {
				this.sendTo(obj.from, obj.command, [], obj.callback);
			}
		}
	}

	onUnload(callback) {
		try {
			if (this.reconnectTimeout) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = null;
			}

			this.stopIntervals();
			void this.closeCurrentConnection().finally(() => callback());
		} catch (error) {
			this.log.error(`Error during unloading: ${error.message}`);
			callback();
		}
	}
}

if (require.main !== module) {
	module.exports = options => new Meshcore(options);
} else {
	new Meshcore();
}
