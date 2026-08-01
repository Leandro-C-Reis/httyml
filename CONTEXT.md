# httyml

Desktop app (Tauri) para administrar projetos de desenvolvimento, onde cada projeto é um conjunto de terminais Linux persistentes usados para rodar comandos de desenvolvimento.

## Language

**Project**:
Agrupamento lógico de Terminals, identificado só por nome. Não tem diretório raiz fixo — cada Terminal dentro dele define seu próprio cwd.
_Avoid_: Workspace, repo

**Terminal**:
Uma sessão de shell interativa (PTY) gerenciada pelo Daemon, com config própria: nome (opcional), cwd, comando de inicialização (opcional), variáveis de ambiente, shell, tamanho de scrollback. Roda sempre local, nunca via SSH.
_Avoid_: Session, tab, pane

**Daemon**:
Processo separado do app, sidecar bundled na aplicação Tauri, responsável por criar e manter os PTYs dos Terminals vivos mesmo com o app fechado. Sobe on-demand (app inicia se não estiver rodando).
_Avoid_: Server, backend

**Estado do Terminal**:
Um Terminal está em um destes estados: _rodando_ (processo ativo), _parado_ (encerrado manualmente pelo usuário, config preservada), ou _encerrado_ (processo morreu sozinho — guarda exit code e motivo, distinto de "parado").
_Avoid_: Stopped (ambíguo entre parado manual e encerrado sozinho), killed

## Rules

- Persistência é feita pelo Daemon, nunca pelo app: o app é só um cliente que conecta/desconecta do Daemon via socket.
- Reabrir o app nunca reconecta terminais automaticamente — conexão é sempre sob demanda, ao abrir a aba daquele Terminal.
- "Parar" um Terminal preserva seu registro e config; "excluir" é uma ação separada e explícita.
