![Logo](admin/meshcore.png)

# ioBroker.meshcore

MeshCore companion adapter for ioBroker with serial connection setup, metadata sync, public channel storage, additional channel subscriptions, and private message history.

## Alpha Status

This adapter is an absolute, untested alpha.

- It has not been validated against a real production ioBroker system.
- It has not been validated against real MeshCore hardware end to end.
- Object model, admin config, message flow, and reconnect handling may still change.
- Do not use this in a critical environment without reviewing the code and testing it yourself.

## Current Scope

- Serial connection to a MeshCore companion device
- Admin UI for selecting the serial port
- Storage of MeshCore self info, device info, contacts, channels, and stats under a dedicated object tree
- Storage of public channel messages
- Subscription to additional channels by index or name
- Storage of incoming and outgoing private messages per contact
- Send states for public, channel, and private text messages

## Object Tree

The adapter uses its own object tree below the instance namespace:

- `info.*`
  Connection state, last error, last sync, configured port
- `meta.*`
  Self info, device info, contacts, channels, core stats, radio stats, packet stats
- `channels.*`
  Public and subscribed channel message history
- `private.*`
  Private message history per contact
- `commands.*`
  States for sending public, channel, and private messages

## Installation via GitHub Link

This repository is intended to be installable directly from the ioBroker admin web interface via GitHub.

After the repository is published, install it in ioBroker admin using the GitHub URL:

```text
https://github.com/goerdy/ioBroker.meshcore
```

Depending on your admin version, this is typically done via the custom installation dialog in the adapters page.

## Configuration

- Select the MeshCore serial device in the admin page.
- Enable or disable public channel storage.
- Add additional subscribed channels by channel index or exact name.
- Adjust reconnect delay, fallback polling interval, stats refresh, and message history size as needed.

## Development

```bash
npm install
npm run lint
npm run check
npm test
```

## Verification Status

Verified locally on August 5, 2026:

- `npm run lint`
- `npm run check`
- `npm test`

Not verified end to end:

- Real serial connection to MeshCore hardware
- Full ioBroker integration with physical device traffic
- Reliable installation from the published GitHub repository, because the public repository push is still pending

## Changelog

### 0.0.1

- Initial alpha release
- Added MeshCore serial adapter base
- Added admin configuration for serial port and channel subscriptions
- Added metadata, channel, and private message object tree
- Added send states for public, channel, and private text messages

## License

MIT License

Copyright (c) 2026 goerdy <goerdy@example.com>
