# Sistema de Consulta e Gestão de Empresas (Econodata)

Um painel interno, sem login, para buscar empresas na Econodata e gerenciar esses dados aqui dentro: salvar, organizar em listas, marcar status e anotar.

## Ponto em aberto: a documentação da API

A Econodata não publica a documentação da API abertamente — ela fica dentro da plataforma logada (menu API / Integrações) ou é enviada pelo suporte. Sem ela, o formato exato de autenticação e os caminhos dos endpoints são incertos.

Por isso o primeiro passo do trabalho é uma **sonda de conexão**: uma tela de diagnóstico que testa as combinações mais prováveis (header `Authorization: Bearer`, `X-API-KEY`, `token`) contra a API e mostra a resposta crua. Assim confirmamos o contrato real antes de construir em cima dele.

Se você conseguir a documentação ou um exemplo de chamada (curl) na plataforma, pulamos essa etapa e vamos direto à integração.

## O que será construído

**1. Busca e consulta**
- Campo de busca por CNPJ com dossiê completo da empresa
- Busca com filtros (segmento/CNAE, UF, cidade, porte) com resultados em lista
- Página de detalhe da empresa: dados cadastrais, endereço, contatos, sócios, faturamento e porte estimados

**2. Gestão local dos dados**
- Botão "Salvar" em qualquer resultado — grava a empresa no banco do app
- Base de empresas salvas com busca, ordenação e filtros próprios
- Listas/pastas para organizar (ex.: "Prospecção SP", "Clientes")
- Status por empresa (Novo, Em contato, Qualificado, Descartado) e campo de anotações
- Exportação da base salva em CSV
- Botão "Atualizar dados" para reconsultar a Econodata e refrescar o registro

**3. Painel inicial**
- Totais: empresas salvas, por status, por lista
- Últimas consultas realizadas

## Como funciona por trás

- **Lovable Cloud** ativado para o banco de dados (empresas salvas, listas, status, anotações, histórico de consultas).
- A chave da API fica guardada no cofre de segredos, nunca no código. Todas as chamadas à Econodata passam por funções de servidor — o navegador nunca vê a chave.
- Um cliente único (`econodata.server.ts`) concentra autenticação, tratamento de erro e normalização da resposta para o formato do app; se a API mudar, só esse arquivo muda.
- Cache das consultas por CNPJ no banco, para não gastar crédito repetindo a mesma busca.
- Como é uso interno sem login, os dados salvos são compartilhados por quem acessa o app; as tabelas ficam com acesso restrito e toda leitura/escrita passa pelo servidor.

## Ordem de execução

1. Ativar Lovable Cloud e guardar a chave no cofre
2. Sonda de conexão para confirmar o contrato da API
3. Consulta por CNPJ + página de detalhe
4. Banco de dados e "salvar empresa"
5. Base salva com listas, status e anotações
6. Busca com filtros e exportação CSV
7. Painel inicial
