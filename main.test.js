'use strict';

const { expect } = require('chai');
const {
	isChannelSubscribed,
	normalizeHex,
	parseSubscribedChannels,
	slugifySegment,
} = require('./lib/meshcore-utils');

describe('meshcore utils', () => {
	it('parses subscribed channels from mixed config values', () => {
		const result = parseSubscribedChannels('0, 2, Ops, Public, 2');
		expect(result.indices).to.deep.equal([0, 2]);
		expect(result.names).to.deep.equal(['ops', 'public']);
	});

	it('normalizes buffers and strings to lowercase hex', () => {
		expect(normalizeHex(Buffer.from([0xaa, 0xbb, 0xcc]))).to.equal('aabbcc');
		expect(normalizeHex('AA:BB-CC')).to.equal('aabbcc');
	});

	it('matches channel subscriptions by index and name', () => {
		const config = parseSubscribedChannels('2, ops');
		expect(isChannelSubscribed(config, { channelIdx: 0, name: 'Public' })).to.equal(true);
		expect(isChannelSubscribed(config, { channelIdx: 2, name: 'Random' })).to.equal(true);
		expect(isChannelSubscribed(config, { channelIdx: 4, name: 'Ops' })).to.equal(true);
		expect(isChannelSubscribed(config, { channelIdx: 5, name: 'Else' })).to.equal(false);
	});

	it('slugifies object tree segments safely', () => {
		expect(slugifySegment('Field Team Alpha')).to.equal('field_team_alpha');
		expect(slugifySegment('@@@', 'fallback')).to.equal('fallback');
	});
});
