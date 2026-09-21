
  # Controle completo do daemon e restauração de terminais

  ## Resumo

  - Manter o daemon independente da janela; ao abrir o app, iniciá-lo automaticamente se estiver parado.
  - Persistir a sessão local da interface — projeto selecionado, ordem das abas, abas abertas e aba ativa — e reanexar os terminais existentes ao reabrir.
  - Adicionar painel de daemon em Settings, no estilo neobrutalista, com status, logs persistidos, iniciar, parar, reiniciar e encerramento forçado.
  - Tornar URLs http:// e https:// visíveis no terminal clicáveis e abri-las no navegador padrão.

  ## Alterações principais

  - Evoluir o daemon para expor status Running, Stopped ou Unresponsive, PID, build ativo e caminho do log; o Pong passará a informar também o PID.
  - Criar PID file no diretório de runtime e log em XDG_STATE_HOME/httyml (com fallback XDG). Registrar apenas eventos e erros do daemon, nunca a saída do terminal; rotacionar ao atingir 1 MiB e manter o arquivo anterior.
  - Fazer Shutdown encerrar ordenadamente todos os grupos de processos dos terminais, preservar projetos/configurações e remover PID/socket. Reiniciar será parar + aguardar + iniciar; nenhum terminal será iniciado
    automaticamente após esse ciclo.

  - Implementar encerramento forçado via PID validado como daemon HTTYML, usando SIGKILL; preservar configurações e sessão, exibir confirmação explícita e aviso de que processos-filho podem não encerrar ordenadamente.
  - Corrigir o ciclo de anexação: conexões do daemon cancelam seus encaminhadores quando o cliente fecha, e anexos Tauri removem entradas obsoletas ao perder a conexão. Após iniciar ou reiniciar o daemon, desmontar/remontar as
    views abertas para obter novo scrollback, estado e conexão.

  - Expor no frontend getDaemonStatus, startDaemon, stopDaemon, restartDaemon, forceKillDaemon e readDaemonLogs, com tipos para status e log truncado.
  - Salvar a sessão em localStorage sob uma chave versionada. Na inicialização, validar IDs contra os projetos/terminais retornados pelo daemon, descartar apenas referências inexistentes e restaurar as abas válidas; importação,
    exclusão e retorno ao dashboard limpam ou reconciliam essa sessão.

  - Adicionar ao Settings uma seção “Daemon”: indicador de status, PID/build, botões contextuais, confirmações inline para parar/reiniciar/forçar, visualizador rolável de logs e atualização periódica enquanto a página estiver
    aberta.

  - Adicionar @xterm/addon-web-links, configurado para aceitar somente URLs HTTP(S), e usar o plugin Tauri Opener já habilitado para chamar openUrl no navegador padrão.

  ## Interfaces e verificações

  - Testar reconexão real: criar terminal, desconectar um cliente como se a janela tivesse fechado, reanexar outro cliente e validar scrollback, estado e entrada/saída contínuos.
  - Testar parada/reinício preservando projetos e configurações, limpeza de conexões ociosas, PID inválido/obsoleto recusado e leitura/rotação de logs.
  - Testar restauração de sessão no React, incluindo IDs removidos, várias abas, aba ativa e reconexão depois de reiniciar o daemon.
  - Testar painel de daemon, confirmações e estados dos controles.
  - Testar que a ativação de um link HTTP(S) chama o opener e que outros esquemas não são abertos.
  - Executar a suíte Rust, a suíte Vitest, verificação de tipos e build do pacote Tauri.

  ## Premissas

  - Parar o daemon encerra terminais em execução, mas nunca remove suas configurações, projetos, scripts ou sessão visual.
  - Após uma parada manual, reabrir o aplicativo inicia o daemon automaticamente; as abas retornam com terminais Stopped até o usuário iniciá-los.
  - O encerramento forçado é específico ao ambiente Unix já assumido pelo projeto e fica disponível para daemon ativo ou sem resposta.