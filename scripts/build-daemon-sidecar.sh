#!/usr/bin/env bash
# Builds the httyml-daemon crate and copies it into src-tauri/binaries/
# under the name Tauri's sidecar mechanism expects: <name>-<target-triple>.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_triple="$(rustc -vV | awk '/^host:/ { print $2 }')"

cargo build -p httyml-daemon --release --manifest-path "$repo_root/Cargo.toml"

mkdir -p "$repo_root/src-tauri/binaries"
cp \
  "$repo_root/target/release/httyml-daemon" \
  "$repo_root/src-tauri/binaries/httyml-daemon-$target_triple"
