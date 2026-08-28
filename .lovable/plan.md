# Produtos/Serviços, Permissões e Rotas

Hierarquia adotada: **Sistema → Unidade (empresa) → Produtos/Serviços → Equipe prospecta**.

## 1. Produtos e Serviços (grupo Prospectar)

Nova página `/produtos` para cadastrar o que a equipe prospecta em cada unidade.

- Cadastro: nome, tipo (produto ou serviço), descrição, ticket/valor de referência, ativo/inativo, unidade dona.
- Listagem agrupada por unidade, respeitando o escopo atual (usuário vê só as unidades vinculadas; master vê todas).
- Quem pode criar/editar/excluir: master e administrador da unidade; demais apenas visualizam.

### Vínculo com a prospecção
- Empresas e atividades passam a ter um produto/serviço associado (opcional).
- Ficha da empresa: seletor de produto em prospecção.
- Funil: novo filtro por produto/serviço, somando valores estimados por coluna.
- Atividades: campo de produto no registro e filtro na lista.

## 2. Papéis e Permissões (grupo Administração)

Novos papéis, substituindo a nomenclatura atual:

| Papel | Alcance |
| --- | --- |
| Master | Tudo no sistema; único que cria unidades e define a matriz |
| Administrador de Unidade | Gerencia produtos, equipe e dados das unidades que administra |
| Gestor de Equipe | Opera prospecção e vê relatórios da unidade |
| Usuário Prospector | Opera consulta, base, funil e atividades da unidade |

Os papéis existentes são migrados: `master` → Master, `gestor` → Gestor de Equipe, `usuario` → Usuário Prospector.

### Página `/permissoes` — "Permissões e rotas"
Página com abas dentro do módulo Administração:

- **Aba Matriz por papel**: tabela rotas × papéis (Painel, Consulta, Base, Listas, Calculadora, Funil, Atividades, Produtos, Equipe, Relatórios, Unidades, Usuários, Permissões) com marcação de acesso e de nível (ver / editar). Editável apenas pelo master.
- **Aba Por usuário**: cada pessoa mostra o que herdou do papel, e o master pode **restringir** ou **ampliar** rota a rota; um indicador mostra "herdado", "ampliado" ou "restrito", com botão de voltar ao padrão do papel.
- **Aba Usuários**: a página de usuários atual passa a viver aqui como aba (criar/editar pessoa, papel, unidades, senha, ativo/inativo). A rota `/usuarios` continua funcionando e redireciona para essa aba, preservando links existentes.

### Efeito das permissões
- O menu lateral mostra apenas os itens permitidos.
- As rotas protegidas verificam a permissão no servidor; sem acesso, exibem aviso de permissão negada em vez do conteúdo.
- Ações sensíveis (criar unidade, gerenciar permissões) continuam exclusivas do master, independentemente da matriz.

## Detalhes técnicos

Migração de banco (uma única migração, com GRANTs e RLS):
- `products` (unit_id, nome, tipo, descricao, valor_referencia, ativo, timestamps).
- `companies.product_id` e `prospection_activities.product_id` (nullable, FK para `products`).
- `app_role` recebe `admin_unidade`; papéis existentes remapeados.
- `role_permissions` (role, rota, nivel) — matriz padrão semeada na própria migração.
- `user_permissions` (user_id, rota, nivel, origem `permitir`/`negar`) — sobreposições por pessoa.
- Função security definer `pode_acessar(_user_id, _rota)` combinando papel + sobreposição, usada nas policies e no servidor.

Código:
- `src/lib/produtos.server.ts` + `produtos.functions.ts`; `src/lib/permissoes.server.ts` + `permissoes.functions.ts`.
- `obterEscopo` em `escopo.server.ts` passa a carregar o mapa de permissões efetivas, e `meFn` o devolve para o menu.
- Novas rotas `_authenticated/produtos.tsx` e `_authenticated/permissoes.tsx`; `usuarios.tsx` vira redirect para a aba.
- `AppShell.tsx`: item Produtos no grupo Prospectar, item Permissões e rotas no grupo Administração, filtragem do menu pelas permissões efetivas.
