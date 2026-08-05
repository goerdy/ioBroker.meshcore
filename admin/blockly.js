'use strict';

(function () {
	/* global Blockly, systemLang */
	if (typeof Blockly === 'undefined') {
		return;
	}

	const COLOR = 210;
	const DEFAULT_INSTANCE = 'meshcore.0';
	const category = 'MeshCore';

	Blockly.CustomBlocks = Blockly.CustomBlocks || [];
	if (!Blockly.CustomBlocks.includes('MeshCore')) {
		Blockly.CustomBlocks.push('MeshCore');
	}

	Blockly.Words = Blockly.Words || {};
	Blockly.Words.meshcore = {
		en: 'MeshCore',
		de: 'MeshCore',
		ru: 'MeshCore',
		pt: 'MeshCore',
		nl: 'MeshCore',
		fr: 'MeshCore',
		it: 'MeshCore',
		es: 'MeshCore',
		pl: 'MeshCore',
		uk: 'MeshCore',
		'zh-cn': 'MeshCore',
	};
	Blockly.Words.meshcore_instance = {
		en: 'instance',
		de: 'Instanz',
		ru: 'экземпляр',
		pt: 'instância',
		nl: 'instantie',
		fr: 'instance',
		it: 'istanza',
		es: 'instancia',
		pl: 'instancja',
		uk: 'екземпляр',
		'zh-cn': '实例',
	};
	Blockly.Words.meshcore_message = {
		en: 'message',
		de: 'Nachricht',
		ru: 'сообщение',
		pt: 'mensagem',
		nl: 'bericht',
		fr: 'message',
		it: 'messaggio',
		es: 'mensaje',
		pl: 'wiadomość',
		uk: 'повідомлення',
		'zh-cn': '消息',
	};
	Blockly.Words.meshcore_channel = {
		en: 'channel',
		de: 'Channel',
		ru: 'канал',
		pt: 'canal',
		nl: 'kanaal',
		fr: 'canal',
		it: 'canale',
		es: 'canal',
		pl: 'kanał',
		uk: 'канал',
		'zh-cn': '频道',
	};
	Blockly.Words.meshcore_target = {
		en: 'target',
		de: 'Ziel',
		ru: 'цель',
		pt: 'alvo',
		nl: 'doel',
		fr: 'cible',
		it: 'destinazione',
		es: 'destino',
		pl: 'cel',
		uk: 'ціль',
		'zh-cn': '目标',
	};
	Blockly.Words.meshcore_send_public = {
		en: 'send MeshCore public message',
		de: 'MeshCore Public-Nachricht senden',
		ru: 'отправить публичное сообщение MeshCore',
		pt: 'enviar mensagem pública MeshCore',
		nl: 'MeshCore publiek bericht verzenden',
		fr: 'envoyer un message public MeshCore',
		it: 'invia messaggio pubblico MeshCore',
		es: 'enviar mensaje público MeshCore',
		pl: 'wyślij publiczną wiadomość MeshCore',
		uk: 'надіслати публічне повідомлення MeshCore',
		'zh-cn': '发送 MeshCore 公共消息',
	};
	Blockly.Words.meshcore_send_channel = {
		en: 'send MeshCore channel message',
		de: 'MeshCore Channel-Nachricht senden',
		ru: 'отправить сообщение канала MeshCore',
		pt: 'enviar mensagem de canal MeshCore',
		nl: 'MeshCore kanaalbericht verzenden',
		fr: 'envoyer un message de canal MeshCore',
		it: 'invia messaggio canale MeshCore',
		es: 'enviar mensaje de canal MeshCore',
		pl: 'wyślij wiadomość kanału MeshCore',
		uk: 'надіслати повідомлення каналу MeshCore',
		'zh-cn': '发送 MeshCore 频道消息',
	};
	Blockly.Words.meshcore_send_private = {
		en: 'send MeshCore private message',
		de: 'MeshCore Privatnachricht senden',
		ru: 'отправить личное сообщение MeshCore',
		pt: 'enviar mensagem privada MeshCore',
		nl: 'MeshCore privébericht verzenden',
		fr: 'envoyer un message privé MeshCore',
		it: 'invia messaggio privato MeshCore',
		es: 'enviar mensaje privado MeshCore',
		pl: 'wyślij prywatną wiadomość MeshCore',
		uk: 'надіслати приватне повідомлення MeshCore',
		'zh-cn': '发送 MeshCore 私人消息',
	};

	function t(word) {
		return (Blockly.Words[word] && Blockly.Words[word][systemLang]) || word;
	}

	function instanceField(input) {
		return input.appendField(t('meshcore_instance')).appendField(new Blockly.FieldTextInput(DEFAULT_INSTANCE), 'INSTANCE');
	}

	function valueCode(block, name) {
		return Blockly.JavaScript.valueToCode(block, name, Blockly.JavaScript.ORDER_COMMA) || '\'\'';
	}

	function sanitizeInstanceField(block) {
		const raw = String(block.getFieldValue('INSTANCE') || DEFAULT_INSTANCE).trim();
		const normalized = raw || DEFAULT_INSTANCE;
		return normalized.startsWith('meshcore.') ? normalized : `meshcore.${normalized.replace(/^meshcore\./, '')}`;
	}

	function quotedStateId(instance, suffix) {
		return `${JSON.stringify(`${instance}.${suffix}`)}`;
	}

	function generateSendCode(instance, lines) {
		return lines
			.map(([suffix, expression]) => `setState(${quotedStateId(instance, suffix)}, ${expression});`)
			.join('\n')
			.concat('\n');
	}

	Blockly.Sendto = Blockly.Sendto || {};
	Blockly.Sendto.blocks = Blockly.Sendto.blocks || {};

	Blockly.Sendto.blocks.meshcore_send_public =
		'<block type="meshcore_send_public"><value name="MESSAGE"><shadow type="text"><field name="TEXT"></field></shadow></value></block>';
	Blockly.Sendto.blocks.meshcore_send_channel =
		'<block type="meshcore_send_channel"><value name="CHANNEL"><shadow type="text"><field name="TEXT">1</field></shadow></value><value name="MESSAGE"><shadow type="text"><field name="TEXT"></field></shadow></value></block>';
	Blockly.Sendto.blocks.meshcore_send_private =
		'<block type="meshcore_send_private"><value name="TARGET"><shadow type="text"><field name="TEXT"></field></shadow></value><value name="MESSAGE"><shadow type="text"><field name="TEXT"></field></shadow></value></block>';

	Blockly.Blocks.meshcore_send_public = {
		init: function () {
			instanceField(this.appendDummyInput()).appendField(t('meshcore_send_public'));
			this.appendValueInput('MESSAGE').setCheck(null).appendField(t('meshcore_message'));
			this.setPreviousStatement(true, null);
			this.setNextStatement(true, null);
			this.setColour(COLOR);
			this.setTooltip('Send a public MeshCore message via the adapter command states.');
			this.setHelpUrl('https://github.com/goerdy/ioBroker.meshcore');
		},
	};

	Blockly.Blocks.meshcore_send_channel = {
		init: function () {
			instanceField(this.appendDummyInput()).appendField(t('meshcore_send_channel'));
			this.appendValueInput('CHANNEL').setCheck(null).appendField(t('meshcore_channel'));
			this.appendValueInput('MESSAGE').setCheck(null).appendField(t('meshcore_message'));
			this.setPreviousStatement(true, null);
			this.setNextStatement(true, null);
			this.setColour(COLOR);
			this.setTooltip('Send a channel MeshCore message via the adapter command states.');
			this.setHelpUrl('https://github.com/goerdy/ioBroker.meshcore');
		},
	};

	Blockly.Blocks.meshcore_send_private = {
		init: function () {
			instanceField(this.appendDummyInput()).appendField(t('meshcore_send_private'));
			this.appendValueInput('TARGET').setCheck(null).appendField(t('meshcore_target'));
			this.appendValueInput('MESSAGE').setCheck(null).appendField(t('meshcore_message'));
			this.setPreviousStatement(true, null);
			this.setNextStatement(true, null);
			this.setColour(COLOR);
			this.setTooltip('Send a private MeshCore message via the adapter command states.');
			this.setHelpUrl('https://github.com/goerdy/ioBroker.meshcore');
		},
	};

	Blockly.JavaScript.meshcore_send_public = function (block) {
		const instance = sanitizeInstanceField(block);
		const message = valueCode(block, 'MESSAGE');
		return generateSendCode(instance, [
			['commands.public.message', message],
			['commands.public.send', 'true'],
		]);
	};

	Blockly.JavaScript.meshcore_send_channel = function (block) {
		const instance = sanitizeInstanceField(block);
		const channel = valueCode(block, 'CHANNEL');
		const message = valueCode(block, 'MESSAGE');
		return generateSendCode(instance, [
			['commands.channel.target', channel],
			['commands.channel.message', message],
			['commands.channel.send', 'true'],
		]);
	};

	Blockly.JavaScript.meshcore_send_private = function (block) {
		const instance = sanitizeInstanceField(block);
		const target = valueCode(block, 'TARGET');
		const message = valueCode(block, 'MESSAGE');
		return generateSendCode(instance, [
			['commands.private.target', target],
			['commands.private.message', message],
			['commands.private.send', 'true'],
		]);
	};

	Blockly.CustomBlocks[category] = Blockly.CustomBlocks[category] || [];
})();
