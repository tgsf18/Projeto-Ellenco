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
java -jar app.jar
# Ou para recompilar via Maven:
# mvn spring-boot:run
```

Defina `JWT_SECRET` antes de iniciar a API. O iniciador `iniciar.ps1` gera uma chave e uma senha de demonstração temporárias automaticamente.

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

## Publicação no Render com o frontend servido pelo backend

O frontend de produção é compilado para `backend/src/main/resources/static` e servido pelo mesmo Spring Boot que atende a API. A aplicação usa chamadas relativas em `/api`, portanto o navegador acessa interface e API pelo mesmo domínio e não depende de liberar uma porta do Render para o Vercel.

Sempre que alterar o React, gere e inclua os arquivos estáticos junto com a mudança:

```bash
cd frontend
npm ci
npm run build:static
```

O comando compila TypeScript/React e substitui os arquivos publicados no diretório estático do backend. Faça commit dos arquivos de `frontend/src` e de `backend/src/main/resources/static` para que o deploy do backend carregue a nova interface.

No serviço Web do Render, escolha o runtime **Docker**. O Render não oferece runtime nativo para Java; o Dockerfile do projeto compila a API e inclui o frontend já copiado para `backend/src/main/resources/static` no mesmo JAR. Configure:

```text
Branch: codex/production-readiness-2026-11 (ou a branch de produção que o serviço acompanha)
Dockerfile Path: backend/Dockerfile
Docker Context Directory: backend
Health check path: /actuator/health
```

O Dockerfile define a compilação e o comando de inicialização; não preencha Build Command ou Start Command no modo Docker. O serviço deve acompanhar a mesma branch que recebe os commits para publicar as alterações.

Configure as variáveis no Render, nunca no GitHub:

```text
SPRING_PROFILES_ACTIVE=render
SPRING_DATASOURCE_URL=jdbc:postgresql://<host-do-pooler-supabase>:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=<usuario-do-pooler>
SPRING_DATASOURCE_PASSWORD=<senha-do-banco>
JWT_SECRET=<segredo-aleatorio-longo>
APP_URL=https://<dominio-do-servico-render>
```

Para Render + Supabase, use a connection string do **pooler em modo Session** fornecida em Supabase → Connect. Não use credenciais de banco no frontend. O perfil `render` ativa PostgreSQL, valida o esquema com Hibernate, aplica migrações Flyway e vincula a aplicação à porta `PORT` informada pelo Render.

### Primeiro acesso como administrador no Render

1. Em **Render → serviço Web → Environment**, configure `ELLENCO_BOOTSTRAP_ENABLED=true`, `ELLENCO_BOOTSTRAP_ADMIN_EMAIL` com um e-mail ainda não cadastrado e `ELLENCO_BOOTSTRAP_ADMIN_PASSWORD` com a senha forte que será usada na conta (mínimo de 12 caracteres).
2. Salve e faça o deploy. Aguarde o health check ficar `Live` e abra o endereço HTTPS do serviço.
3. Entre usando o e-mail e a senha definidos no Render. Guarde a senha em local seguro: remover a variável de bootstrap não altera a senha da conta.
4. Remova `ELLENCO_BOOTSTRAP_ADMIN_PASSWORD`, mude `ELLENCO_BOOTSTRAP_ENABLED` para `false` e faça novo deploy. O administrador já criado permanece no banco.
5. Para as demais pessoas, use **Criar conta**; cadastro público concede apenas o perfil Funcionário. Um administrador pode alterar o perfil depois, pela gestão de usuários.

Não tente criar o primeiro administrador pelo cadastro público. Se o e-mail informado no bootstrap já existir com um perfil diferente, a aplicação interrompe a inicialização para evitar promover uma conta por engano. Nunca envie a senha pelo GitHub ou por mensagens públicas.

Os relatórios mostram tabelas filtráveis por intervalo; **Exportar Excel (CSV)** gera arquivo que o Excel abre, e **Imprimir / PDF** usa a impressão do navegador. Campos `date` e `datetime-local` abrem o seletor de calendário nativo do dispositivo.

O Render fornece um endereço HTTPS `onrender.com` para acesso imediato. Um domínio próprio exige que o domínio esteja registrado e que os registros DNS correspondentes sejam configurados no Render e no provedor do domínio.

### Catálogos, recebimentos e entrega de EPI

- Campos de relacionamento pesquisam funcionários, cargos, obras, galpões, fornecedores e produtos já cadastrados. O texto digitado na busca só filtra opções; não cria registros. A busca também considera as iniciais do cargo, por exemplo `RH` para `Recursos Humanos`.
- As funções de trabalho aceitas ficam em `JobFunctionCatalog`; os cargos de acesso (Funcionário, Supervisor, Administrador, CEO e Administrador Global) continuam sendo outro dado e não são tratados como profissão.
- Para receber um EPI, cadastre o produto com CA e validade do CA, e informe lote e validade futura na nota. No recebimento, selecione fornecedor, galpão e produto do catálogo.
- A entrega de EPI exige funcionário ativo, EPI com CA vigente, lote identificado e válido, previsão de troca dentro das validades e saldo disponível. A operação baixa o saldo do lote e grava o movimento junto à entrega e ao aceite.
- O Flyway aplica as migrações `V008`–`V013` para separar quem abriu e aprovou inventário, vincular entrega e saldo/movimentação, registrar validade do CA, relacionar fornecedor e empréstimo à obra e evitar repetir a mesma nota do fornecedor.

### Operação e desempenho

- O dashboard reaproveita a resposta por 15 segundos e se atualiza após operações concluídas, evitando consultas repetidas ao navegar entre telas.
- Respostas de `/api` não são gravadas no cache offline do navegador, pois podem conter dados privados de pessoas e estoque.
- Operações de estoque e EPI não são reenviadas automaticamente depois de uma falha de rede. Confira o histórico antes de tentar novamente para evitar duplicar entregas ou movimentações.
- Alertas prioritários aparecem em notificações compactas e podem abrir o módulo relacionado.

## Dependências externas para a entrada em produção

- Validar no Render as variáveis de ambiente do PostgreSQL/Supabase, segredo JWT, serviço de e-mail e configuração do deploy automático.
- Para usar um domínio próprio, registrar o domínio e configurar DNS no Render e no registrador.
- Ativar integrações ERP, RH, SESMT ou eSocial somente após receber credenciais e endpoints oficiais da empresa.

Este repositório está preparado para evoluir incrementalmente, sem apagar a base original de estudo do projeto Conliz.
