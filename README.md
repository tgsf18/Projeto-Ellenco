# ELLENCO — Plataforma Operacional

Este projeto foi estruturado como uma base real para a evolução da plataforma operacional da ELLENCO, preservando o diagnóstico do projeto original e criando uma arquitetura profissional para autenticação, autorização, estoque e operação.

## Estrutura

- `backend/` — API em Java + Spring Boot + Spring Security + JPA
- `frontend/` — aplicação em React + TypeScript + Vite + Tailwind

## Etapas implementadas na base inicial

1. Diagnóstico arquitetural do projeto legado
2. Estruturação da API e autenticação
3. Definição de perfis ADMIN / SUPERVISOR / FUNCIONÁRIO
4. Base de entidades principais e módulos
5. Base do frontend para login e central de operações
6. Documentação de execução

## Requisitos para execução local

### Backend
- Java 17+
- Maven 3.9+
- PostgreSQL 17+ para ambiente integrado/produção

### Frontend
- Node.js 18+
- npm ou pnpm

## Como executar

### ⚡ Inicialização Rápida e Portátil (1 Clique)

Para rodar em qualquer computador sem precisar compilar ou configurar nada manualmente:
- **Dê 2 cliques no arquivo `iniciar.bat`** (ou execute `.\iniciar.ps1` no PowerShell).
- Para encerrar ambos os servidores, execute `parar.bat`.

### Desenvolvimento tradicional (Manual)

```bash
cd backend
java -jar app.jar --ellenco.bootstrap.enabled=true
# Ou para recompilar via Maven:
# mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O desenvolvimento rápido continua usando H2 em memória. A API fica em `http://localhost:8083` e o frontend em `http://localhost:5173`.

### Ambiente completo com Docker e PostgreSQL

1. Instale Docker Desktop.
2. Copie `.env.example` para `.env`.
3. Troque todas as senhas e gere um `JWT_SECRET` longo e aleatório.
4. Execute:

```bash
docker compose up --build
```

Acesse `http://localhost:5173`. O frontend encaminha `/api` internamente ao backend, o PostgreSQL possui volume persistente e o Flyway aplica as migrações antes da validação do modelo JPA.

Para acompanhar ou encerrar:

```bash
docker compose logs -f
docker compose down
```

Use `docker compose down` sem `-v` para preservar os dados. A remoção do volume apaga o banco local.

## Variáveis de ambiente

Use `.env.example` como referência. Nunca versione o arquivo `.env` real. As variáveis principais são:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ellenco
SPRING_DATASOURCE_USERNAME=ellenco
SPRING_DATASOURCE_PASSWORD=uma-senha-forte
JWT_SECRET=um-segredo-aleatorio-longo
```

Em produção, defina `BOOTSTRAP_ENABLED=false` depois de criar contas administrativas pelo processo seguro da implantação.

## Estrutura de implantação

- `backend/Dockerfile` — build multi-stage da API e execução sem usuário privilegiado.
- `frontend/Dockerfile` — build do React e publicação pelo Nginx.
- `frontend/nginx.conf` — SPA, proxy da API, cache e cabeçalhos básicos de segurança.
- `compose.yaml` — frontend, backend e PostgreSQL com health checks.
- `backend/src/main/resources/db/migration/` — esquema versionado pelo Flyway.

## Próximas etapas recomendadas

- CRUD de galpões
- cadastro de produtos e categorias
- recebimento e conferência
- distribuição e obras
- EPI e entrega
- assinatura e fotos
- auditoria e relatórios
- PWA e mobile-first

Este repositório está preparado para evoluir incrementalmente, sem apagar a base original de estudo do projeto Conliz.
