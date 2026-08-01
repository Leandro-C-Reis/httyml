# App-Daemon IPC: Unix domain socket, JSON length-prefixed framing

The app and Daemon are separate processes on the same machine, so we use a Unix domain socket (not TCP loopback) — local-only by construction, no port management, access restricted by file permissions. Messages are length-prefixed JSON rather than a custom binary format: the dominant traffic is text (terminal output, control commands), so parsing overhead is irrelevant, and JSON is far easier to debug than a bespoke binary protocol.
