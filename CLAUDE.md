## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## tauri-v2

Tauri v2 project. Trigger `/tauri-v2` skill for: tauri.conf.json config, Rust `#[tauri::command]`, IPC (invoke/emit/channels), permissions/capabilities, build/deploy.

## Style Guide

App visual style: **neobrutalism**. Trigger `neobrutalism` skill (`.agents/skills/neobrutalism/SKILL.md`) for design-system guidance. Apply to all new UI work.
