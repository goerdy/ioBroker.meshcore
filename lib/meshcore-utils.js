'use strict';

/**
 * @param {unknown} value Value to normalize for an object tree segment.
 * @param {string} [fallback] Fallback when the normalized segment is empty.
 * @returns {string} Safe lowercase object tree segment.
 */
function slugifySegment(value, fallback = 'item') {
	const source = String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

	return source || fallback;
}

/**
 * @param {string | string[] | undefined | null} value Raw channel subscription config.
 * @returns {{ indices: number[]; names: string[] }} Parsed channel subscriptions by index and name.
 */
function parseSubscribedChannels(value) {
	if (!value) {
		return { indices: [], names: [] };
	}

	const tokens = Array.isArray(value)
		? value
		: String(value)
				.split(/[\n,;]+/g)
				.map(token => token.trim())
				.filter(Boolean);

	const indices = new Set();
	const names = new Set();

	for (const token of tokens) {
		if (/^\d+$/.test(token)) {
			indices.add(Number(token));
		} else {
			names.add(token.toLowerCase());
		}
	}

	return {
		indices: [...indices].sort((a, b) => a - b),
		names: [...names].sort(),
	};
}

/**
 * @param {string | Buffer | Uint8Array | null | undefined} value Hex-like input value.
 * @returns {string} Lowercase hexadecimal string without separators.
 */
function normalizeHex(value) {
	if (value == null) {
		return '';
	}

	if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
		return Buffer.from(value).toString('hex');
	}

	return String(value)
		.trim()
		.toLowerCase()
		.replace(/[^a-f0-9]/g, '');
}

/**
 * @param {{ indices: number[]; names: string[] }} subscriptionConfig Parsed subscription config.
 * @param {{ channelIdx: number; name?: string | null } | null | undefined} channel Channel metadata to test.
 * @returns {boolean} True when the channel should be monitored.
 */
function isChannelSubscribed(subscriptionConfig, channel) {
	if (!channel) {
		return false;
	}

	if (channel.channelIdx === 0) {
		return true;
	}

	if (subscriptionConfig.indices.includes(channel.channelIdx)) {
		return true;
	}

	const normalizedName = String(channel.name ?? '')
		.trim()
		.toLowerCase();
	return normalizedName !== '' && subscriptionConfig.names.includes(normalizedName);
}

module.exports = {
	isChannelSubscribed,
	normalizeHex,
	parseSubscribedChannels,
	slugifySegment,
};
