#!/usr/bin/env bash
# Builds the httyml-daemon crate and copies it into src-tauri/binaries/
# under the name Tauri's sidecar mechanism expects: <name>-<target-triple>.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_triple="$(rustc -vV | awk '/^host:/ { print $2 }')"

# Kill any daemon already bound to the socket before rebuilding. `ensure_daemon`
# only checks "is *something* listening" — it has no way to tell a fresh build
# apart from a stale process left over from a previous `tauri dev` session (or
# one that crashed without cleaning up), so that stale process just keeps
# shadowing whatever gets built here. This is dev-loop-only: it never runs
# against a live user's daemon, only whenever this script itself runs.
socket_path="${XDG_RUNTIME_DIR:-/tmp}/httyml.sock"
if [ -S "$socket_path" ] && command -v fuser >/dev/null 2>&1; then
  fuser -k "$socket_path" >/dev/null 2>&1 || true
  sleep 0.2
fi

cargo build -p httyml-daemon --release --manifest-path "$repo_root/Cargo.toml"

mkdir -p "$repo_root/src-tauri/binaries"
cp \
  "$repo_root/target/release/httyml-daemon" \
  "$repo_root/src-tauri/binaries/httyml-daemon-$target_triple"
