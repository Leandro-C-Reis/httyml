# Terminals are local-only; no remote/SSH support

Scope is explicitly limited to PTYs on the same machine as the Daemon. Remote/SSH terminals were considered and rejected for now — they'd add authentication, reconnect-over-network, and key management for no confirmed need. If added later, it extends the existing Terminal model (a "remote" variant) rather than requiring a redesign.
