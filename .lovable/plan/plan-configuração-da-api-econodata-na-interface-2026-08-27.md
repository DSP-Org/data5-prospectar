# Plan: Configuração da API Econodata na interface

Adicionar uma tela de configurações no Prospectar360 para que o usuário possa inserir e trocar a chave da API Econodata diretamente pela interface, sem depender do cofre de segredos.

## Proposta

1. **Tabela de configurações**
   - Criar `public.app_settings` com `key` (PK, text) e `value` (text).
   - GRANT ALL apenas para `service_role`; sem acesso `anon`/`authenticated`.
   - Habilitar RLS sem policies, mantendo o padrão de segurança atual do projeto.

2. **Leitura da chave no servidor**
   - Alterar `src/lib/econodata.server.ts` para buscar o token primeiro em `public.app_settings` (key = `econodata_api_key`) e, como fallback, em `process.env["ECONODATA_API_KEY"]`.
   - Manter a chave apenas no servidor: nunca enviar para o navegador.

3. **Server functions de configuração**
   - `getApiKeyFn`: retorna se há chave salva e a máscara dos últimos 4 caracteres (não o valor completo).
   - `saveApiKeyFn`: valida formato UUID v4 e persiste na tabela.
   - `testApiKeyFn`: salva provisoriamente, chama `/valid-token-integration` e, se falhar, reverte; se ok, confirma o salvamento.

4. **Tela de configurações**
   - Criar rota `/configuracoes` com:
     - input tipo password para a chave;
     - botão "Testar e salvar";
     - badge de status (conectado / desconectado / inválido);
     - aviso sobre a chave ser armazenada no banco com acesso restrito ao servidor.
   - Adicionar item "Configurações" no menu do `AppShell`.

5. **Migração da chave atual**
   - Incluir no deploy uma migração que copie o valor atual de `ECONODATA_API_KEY` para `public.app_settings`, garantindo continuidade.

## Observação de segurança

Como o Prospectar360 não possui autenticação de usuários, qualquer pessoa com acesso ao app publicado poderá alterar a chave pela tela de configurações. Isso é aceitável para uso interno, mas deve ser considerado antes de publicar amplamente.
