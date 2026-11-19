# Ellenco Construções — Render + Supabase

Sistema de metas por pessoa, equipes, funções, calendário e alertas.
Stack real: **PHP 8.3 + Apache** (container Docker), banco **PostgreSQL no Supabase**.

---

## 1. Banco de dados (SQL puro)

Aplique **nesta ordem**, no SQL Editor do Supabase (ou por `psql`):

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1º | `database.sql` | Estrutura original (usuários, metas, eventos). Só rode se o projeto ainda estiver vazio. |
| 2º | `database-V1.sql` | Metas por pessoa (`meta_atribuicoes`), equipes + `equipe_membros.papel`, funções, anexos/links, notificações, triggers de status, RLS. |
| 3º | `database-V2.sql` | Metadados de anexo (categoria/extensão), eventos com `fim`/`local`/`link`/`participantes`, **índices GIN trigram** que deixam a busca rápida, chave de deduplicação das notificações e as views de detalhe. |

Todos são **idempotentes** (`IF NOT EXISTS` / `DROP … IF EXISTS`): podem ser rodados de novo sem alterar nada.

```bash
# via psql, se preferir
psql "postgresql://postgres.<ref>:<senha>@<host-pooler>:5432/postgres?sslmode=require" \
     -f database.sql -f database-V1.sql -f database-V2.sql
```

> Use o **Session Pooler** (porta 5432). A conexão direta do Supabase é IPv6-only e não funciona no Render.

### Aplicar pelo navegador (alternativa)

Com o serviço já no ar, abra:

```
https://SEU-DOMINIO/migrar.html?chave=ellenco-migrar
```

Roda `database-V1.sql` + `database-V2.sql` dentro de **uma transação** (falhou = nada gravado),
mostra o comprovante do que foi criado e confere os índices trigram da busca.
Para trocar a chave, defina `ELLENCO_MIGRAR_CHAVE` nas variáveis do Render.

---

## 2. Variáveis de ambiente (Render → Environment)

| Variável | Valor |
|---|---|
| `DB_HOST` | host do Session Pooler do Supabase |
| `DB_PORT` | `5432` |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres.<project-ref>` |
| `DB_PASS` | senha do banco (nunca no repositório) |
| `DB_SSLMODE` | `require` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` — só para upload de anexos |
| `SUPABASE_SERVICE_KEY` | `service_role` — só no Render, nunca no Git |
| `ELLENCO_BUCKET` | bucket do Storage (padrão: `metas`) |
| `ELLENCO_MIGRAR_CHAVE` | opcional, chave da rota de migração |

---

## 3. Estrutura do projeto

```
.htaccess            páginas amigáveis (.html → backend/*.php) + cabeçalhos
router.php           mesmo roteamento para `php -S` local
Dockerfile           PHP 8.3 + Apache
login.html           formulário de entrada (assets/auth.css)
cadastro.html        formulário de cadastro (sempre cria funcionário)
database*.sql        migrações (ver seção 1)
assets/              app.css, app.js, auth.css — sem CDN, sem build
backend/
  config.php         define() das variáveis de banco
  db.php             conexão + helpers (h, can, csrf, busca, paginação, anexos, notificar)
  layout.php         shell da aplicação (sidebar, topbar, modais, ícones)
  health.php         JSON de saúde: php, banco, migracao_v1/v2, busca_indexada
  migrar.php         aplica as migrações (protegido por ?chave=)
  paginas/           conteúdo das páginas
    painel.php       metas por pessoa, detalhe com anexos e links
    equipe.php       equipes, membros, pessoas, funções
    calendario.php   grade do mês + modal de detalhe do evento
    alertas.php      avisos do sino, prazos e próximos eventos
    config.php       perfil, senha, usuários, aparência (menu em lista)
  login.php logout.php register.php relatorio.php
preview/             prévia estática (Node) para conferir o visual sem PHP
```

Os arquivos `backend/painel.php`, `equipe.php`, `calendario.php`, `alertas.php` e `config.php`
são invólucros de uma linha: `backend/` guarda só infraestrutura e `backend/paginas/` o conteúdo.

---

## 4. Verificação depois do deploy

1. `https://SEU-DOMINIO/backend/health.php` → `"banco": "ok"`, `"migracao_v1": "aplicada"`,
   `"migracao_v2": "aplicada"`, `busca_indexada` maior que zero.
2. `https://SEU-DOMINIO/` → cai no login se não houver sessão.
3. Painel de Metas: a busca por título/descrição e os chips de filtro devem responder.

---

## 5. Observações

- Sem CDN: todo o CSS/JS é local (`assets/`).
- Cores só por token (`var(--…)`), com tema claro e escuro.
- Listas sempre paginadas no SQL (`LIMIT/OFFSET` + `COUNT(*)`), nunca `findAll()` no PHP.
- O cadastro público cria **sempre** funcionário (`tipo_acesso = 'usuario'`); promover é feito
  em Configurações → Usuários e acessos.
- Upload de anexos usa o Storage do Supabase por REST; sem `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`
  o anexo de arquivo devolve erro explicativo e o **link** continua funcionando.
