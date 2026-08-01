# Daemon implements its own PTY multiplexer, not tmux/screen

We considered having the Daemon shell out to tmux/screen for session persistence instead of managing PTYs directly. Rejected: it would require tmux installed, put session state in a format outside the app's control, and force integration via parsing command output instead of a clean in-process API. The Daemon owns `portable-pty` processes and scrollback buffers itself.
