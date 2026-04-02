# RepoSys

Aplicação full stack para gestão de reposições, com painel web em React e API em Node.js/Express. O projeto reúne autenticação com perfis, dashboard operacional, agenda semanal, tabela de reposições, anotações colaborativas e eventos em tempo real via Socket.IO.

## Visão Geral

O repositório está dividido em duas aplicações:

- `src/` e `public/`: frontend React com Material UI e suporte a instalação como PWA.
- `server/`: backend Express com autenticação JWT, refresh token, eventos em tempo real e persistência em MongoDB.

## Funcionalidades

- Login com JWT e refresh token.
- Perfis de acesso `admin`, `manager` e `viewer`.
- Dashboard com indicadores por status, dia, categoria e feed de atividade.
- Tabela de reposições com busca, filtros, paginação, ordenação e exclusão em massa.
- Agenda semanal agrupada por dia.
- Cadastro, edição e remoção de reposições.
- Gestão de usuários para administradores.
- Anotações pessoais e gerais, com cores e itens fixados.
- Atualizações em tempo real para atividade, reposições e anotações.
- PWA com `manifest.webmanifest` e `service-worker.js`.

## Stack Técnica

### Frontend

- React 18
- Material UI
- Axios
- Socket.IO Client
- `react-scripts`

### Backend

- Node.js
- Express
- MongoDB Driver
- Socket.IO
- JWT
- `bcryptjs`

### Persistência e legado

- Banco principal atual: MongoDB
- Compatibilidade legada: SQLite (`better-sqlite3`) e `server/data.json`

## Requisitos

- Node.js 18 ou superior
- npm
- MongoDB acessível pela `MONGODB_URI`

## Configuração de Ambiente

Os arquivos de ambiente reais devem continuar locais e fora do Git. Para facilitar o setup, o projeto agora inclui:

- [`.env.example`](/f:/repo/.env.example)
- [`.env.development.example`](/f:/repo/.env.development.example)
- [`server/.env.example`](/f:/repo/server/.env.example)

### Frontend

Variáveis principais:

- `HOST`
- `PORT`
- `REACT_APP_BACKEND_PORT`
- `REACT_APP_API_URL` opcional

### Backend

Variáveis principais:

- `PORT`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_ORIGIN` ou `ALLOWED_ORIGINS`
- `RESET_DB_ON_START`
- `IMPORT_LEGACY_SQLITE`
- `IMPORT_LEGACY_JSON`

## Instalação

Instale frontend e backend:

```bash
npm run install:all
```

## Execução em Desenvolvimento

Suba os dois serviços:

```bash
npm start
```

Endereços padrão:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

O frontend tenta localizar automaticamente o backend usando o mesmo hostname/IP com a porta configurada em `REACT_APP_BACKEND_PORT`, o que ajuda em testes pela rede local.

## Execução Manual

### Frontend

```bash
npm run client
```

### Backend

```bash
npm run server
```

Ou diretamente dentro de `server/`:

```bash
cd server
npm run dev
```

## Script Linux

O projeto inclui [`iniciar.sh`](/f:/repo/iniciar.sh), que instala dependências quando necessário e sobe frontend e backend:

```bash
chmod +x iniciar.sh
./iniciar.sh
```

## Build

Para gerar a versão de produção do frontend:

```bash
npm run build
```

## Estrutura do Projeto

```text
.
|-- public/
|-- src/
|   |-- components/
|   |-- pages/
|   |-- services/
|   `-- theme/
|-- server/
|   |-- db.js
|   |-- index.js
|   `-- data.json
|-- package.json
|-- root-package.json
`-- README.md
```

## Arquitetura Funcional

### Frontend

- `src/App.jsx`: autenticação, navegação interna, tema, PWA e conexão Socket.IO.
- `src/services/api.js`: cliente HTTP, refresh automático de sessão e regras de permissão.
- `src/pages/Dashboard.jsx`: visão executiva e feed de atividade.
- `src/pages/Tabela.jsx`: operação principal com filtros, ordenação e ações em lote.
- `src/pages/Agenda.jsx`: distribuição semanal por dia.
- `src/pages/Notes.jsx`: anotações pessoais e gerais.
- `src/pages/Users.jsx`: administração de usuários.

### Backend

- `server/index.js`: API REST, autenticação, autorização e eventos em tempo real.
- `server/db.js`: acesso ao MongoDB, seeds, migração legada, contadores e serialização.

## Principais Endpoints

### Autenticação

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Reposições

- `GET /api/reposicoes`
- `GET /api/reposicoes/:id`
- `POST /api/reposicoes`
- `PUT /api/reposicoes/:id`
- `DELETE /api/reposicoes/:id`

### Apoio operacional

- `GET /api/stats`
- `GET /api/activity`
- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`

## PWA

Em produção, o frontend registra `public/service-worker.js` e permite instalação do app quando o navegador suporta esse fluxo. O cache ignora chamadas de API e WebSocket para evitar dados operacionais desatualizados.

## Observações

- O backend depende de `MONGODB_URI`; sem isso a API não sobe.
- O projeto ainda mantém rotas e rotinas de compatibilidade para dados legados.
- O arquivo principal de scripts é [`package.json`](/f:/repo/package.json). O [`root-package.json`](/f:/repo/root-package.json) parece ser um artefato anterior.
