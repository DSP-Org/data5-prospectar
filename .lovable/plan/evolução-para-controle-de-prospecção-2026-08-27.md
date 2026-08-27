# Evolução para controle de prospecção

## Objetivo
Transformar o Prospectar360 de uma "base de consulta" em um CRM enxuto de prospecção: menu lateral, funil comercial, histórico de atividades, calculadora de metas e relatórios.

## Entregas desta fase (prioridade)

### 1. Menu lateral
- Substituir a navegação horizontal do topo por um menu lateral fixo e colapsável.
- Itens: Painel, Consulta, Base de empresas, Listas, Funil, Atividades, Calculadora, Relatórios, Configurações.
- Manter o cabeçalho apenas com logo + título, liberando espaço vertical.

### 2. Funil (Kanban)
- Nova rota `/funil`.
- Colunas: Novo, Em contato, Qualificado, Cliente, Descartado.
- Cada card mostra razão social, CNPJ, local, última atividade e valor estimado quando houver.
- Permitir mover empresa de coluna (seletor ou arrastar) — isso atualiza o `status` da empresa.
- Contadores por etapa em tempo real.

### 3. Atividades
- Nova tabela `prospection_activities` vinculada ao CNPJ da empresa.
- Tipos: Ligação, E-mail, WhatsApp, Reunião, Tarefa, Nota.
- Campos: tipo, observação, data/hora, data agendada, concluído, responsável (texto livre).
- Nova rota `/atividades` com histórico geral, filtros por tipo e por empresa.
- Adicionar painel de atividades na ficha da empresa (`/empresas/$cnpj`).
- O funil mostra a última atividade de cada empresa no card.

### 4. Calculadora
- Nova rota `/calculadora` com duas abas:
  - **Metas de prospecção**: dado ticket médio, meta de faturamento e taxas de conversão, calcula quantas empresas precisam ser contatadas/requalificadas/fechadas por mês.
  - **ROI / comissão**: ticket, margem, % comissão, CAC estimado → mostra lucro e ponto de equilíbrio.
- Resultados exportáveis como resumo de texto.

### 5. Relatórios
- Nova rota `/relatorios` com cards iniciais:
  - Total de empresas por status.
  - Volume de atividades nos últimos 7/30/90 dias.
  - Taxa de conversão entre etapas (novo → cliente).
  - Ranking de estados e fontes.
- Pronto para, em seguida, virar PDF/download.

## O que fica para depois
- Cadência automática de follow-ups.
- Atribuição real de usuários (o app ainda não tem login).
- Dashboard personalizável.

## Decisões técnicas
- Mantém sem login/autenticação por enquanto (igual ao app atual).
- Todas as novas tabelas seguem o mesmo padrão de acesso via `service_role`.
- Drag-and-drop será via `@dnd-kit/core` (leve, compatível com Worker).
- Layout responsivo: em telas pequenas o menu lateral vira drawer.
