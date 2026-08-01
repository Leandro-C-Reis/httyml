# Persistent terminals via a separate daemon process

Terminals must keep running (e.g. a long-lived `npm run dev`) even when the app window is closed. We decided the app itself never owns the PTY processes directly — a separate Daemon process does, and the app is just a client that connects/disconnects from it over IPC. This costs real complexity (a second long-running process, an IPC protocol, reconnect logic) but is the only way to survive the app closing without losing running processes.
