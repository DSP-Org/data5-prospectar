# Trocar a chave da API Econodata

Substituir o token de integração atual por um novo, sem mexer em nenhuma outra parte do sistema.

## Passos

1. Abrir o formulário seguro de segredos para você colar a nova chave em `ECONODATA_API_KEY` (o valor nunca aparece no chat nem no código).
2. Validar a nova chave chamando o endpoint `/valid-token-integration` da Econodata e confirmar a conta vinculada.
3. Fazer uma consulta de teste por CNPJ para garantir que o enriquecimento continua retornando a ficha completa.
4. Se a chave nova falhar, avisar imediatamente e manter a anterior até você enviar outra.

## Detalhes técnicos

- Só o segredo `ECONODATA_API_KEY` muda; `src/lib/econodata.server.ts` já lê o valor em tempo de execução dentro do handler, então nenhum arquivo precisa ser editado.
- Base URL segue `https://api.econodata.com.br/ecdt-api`, com o token enviado no header `Authorization`.
- Validação: `GET /valid-token-integration` e depois `POST /companies` com um CNPJ de teste.
