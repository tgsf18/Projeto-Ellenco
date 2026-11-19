-- ============================================================================
-- ELLENCO — Migração V1
-- Metas por pessoa, equipes, funções, anexos e links, calendário com escopo
-- e notificações (sino).
--
-- Como aplicar: Supabase → SQL Editor → cole e execute todo este arquivo.
-- Depois rode o database.sql original se ainda não rodei (ele é a V0).
--
-- Características:
--   * Idempotente (IF NOT EXISTS / DROP ... IF EXISTS) — pode rodar 2x.
--   * NÃO apaga dado nenhum: as metas que já existem ganham uma atribuição
--     para cada usuário ativo do setor (seção 4).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. FUNÇÕES (cargos). O admin escolhe a função de cada funcionário.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funcoes (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome      VARCHAR(80)  NOT NULL UNIQUE,
  descricao VARCHAR(255) NULL,
  criado_em TIMESTAMP    NOT NULL DEFAULT now()
);

INSERT INTO funcoes (nome) VALUES
  ('Engenheiro'), ('Mestre de Obras'), ('Administrativo'),
  ('Financeiro'), ('Comercial'), ('Projetista')
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS funcao_id BIGINT NULL
  REFERENCES funcoes(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url  VARCHAR(500) NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone  VARCHAR(30)  NULL;

-- 'gestor' entra no conjunto de papéis; 'admin' continua sendo o acesso total.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_tipo_acesso_check') THEN
    ALTER TABLE usuarios DROP CONSTRAINT usuarios_tipo_acesso_check;
  END IF;
  ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_acesso_check
    CHECK (tipo_acesso IN ('usuario','gestor','admin'));
END $$;

-- ---------------------------------------------------------------------------
-- 2. EQUIPES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome       VARCHAR(120) NOT NULL UNIQUE,
  descricao  VARCHAR(255) NULL,
  cor        VARCHAR(7)   NOT NULL DEFAULT '#4F46E5',
  criado_por BIGINT       NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipe_membros (
  equipe_id  BIGINT    NOT NULL REFERENCES equipes(id)  ON DELETE CASCADE,
  usuario_id BIGINT    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  entrou_em  TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (equipe_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_equipe_membros_usuario ON equipe_membros (usuario_id);

-- Papel dentro da equipe: 'lider' aparece primeiro no card e recebe os avisos.
ALTER TABLE equipe_membros ADD COLUMN IF NOT EXISTS papel VARCHAR(10) NOT NULL DEFAULT 'membro'
  CHECK (papel IN ('membro','lider'));

-- ---------------------------------------------------------------------------
-- 3. METAS: prioridade, anexos/links e — o que faltava — atribuição por pessoa
-- ---------------------------------------------------------------------------
ALTER TABLE metas ALTER COLUMN setor DROP NOT NULL;
ALTER TABLE metas ADD COLUMN IF NOT EXISTS prioridade VARCHAR(6) NOT NULL DEFAULT 'media'
  CHECK (prioridade IN ('baixa','media','alta'));
ALTER TABLE metas ADD COLUMN IF NOT EXISTS valor_alvo NUMERIC(14,2) NULL;
ALTER TABLE metas ADD COLUMN IF NOT EXISTS unidade    VARCHAR(20)   NULL;
ALTER TABLE metas ADD COLUMN IF NOT EXISTS ativa      SMALLINT      NOT NULL DEFAULT 1;
COMMENT ON COLUMN metas.descricao IS
  'HTML sanitizado pelo servidor (ver sanitize_html em backend/db.php). Nunca HTML cru do editor.';

-- ★ A tabela que faltava: uma linha por (meta, pessoa)
CREATE TABLE IF NOT EXISTS meta_atribuicoes (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meta_id        BIGINT NOT NULL REFERENCES metas(id)    ON DELETE CASCADE,
  usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  progresso      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  valor_atingido NUMERIC(14,2) NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'a_fazer'
    CHECK (status IN ('a_fazer','em_andamento','concluida','atrasada')),
  concluida_em   TIMESTAMP NULL,
  criado_em      TIMESTAMP NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (meta_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_atrib_usuario ON meta_atribuicoes (usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_atrib_meta    ON meta_atribuicoes (meta_id);

CREATE TABLE IF NOT EXISTS meta_anexos (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meta_id    BIGINT NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  tipo       VARCHAR(8)   NOT NULL CHECK (tipo IN ('arquivo','link')),
  nome       VARCHAR(255) NOT NULL,
  url        VARCHAR(1000) NOT NULL,
  mime       VARCHAR(120) NULL,
  tamanho    BIGINT       NULL,
  criado_por BIGINT       NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em  TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_anexos_meta ON meta_anexos (meta_id);

-- histórico append-only: ligar cada registro à atribuição de quem atualizou
ALTER TABLE meta_atualizacoes ADD COLUMN IF NOT EXISTS atribuicao_id BIGINT NULL
  REFERENCES meta_atribuicoes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_meta_atualizacoes_atrib
  ON meta_atualizacoes (atribuicao_id, criado_em);

-- ---------------------------------------------------------------------------
-- 4. BACKFILL — não perder dado.
--    Cada meta existente ganha uma atribuição para cada usuário ativo do
--    setor, herdando o progresso atual. Daqui pra frente a fonte da verdade
--    do progresso é meta_atribuicoes.progresso.
-- ---------------------------------------------------------------------------
INSERT INTO meta_atribuicoes (meta_id, usuario_id, progresso, status, concluida_em)
SELECT m.id,
       u.id,
       m.progresso_percentual,
       m.status,
       CASE WHEN m.status = 'concluida' THEN m.atualizado_em ELSE NULL END
FROM metas m
JOIN usuarios u ON u.setor = m.setor AND u.ativo = 1
WHERE NOT EXISTS (
  SELECT 1 FROM meta_atribuicoes a
  WHERE a.meta_id = m.id AND a.usuario_id = u.id
);

-- ---------------------------------------------------------------------------
-- 5. EVENTOS: escopo (geral / equipe / pessoa), fim, local e vínculo com meta
-- ---------------------------------------------------------------------------
ALTER TABLE eventos ALTER COLUMN setor DROP NOT NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS fim          TIMESTAMP     NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS dia_inteiro SMALLINT      NOT NULL DEFAULT 0;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS local        VARCHAR(200) NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS meta_id      BIGINT       NULL
  REFERENCES metas(id) ON DELETE SET NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS escopo       VARCHAR(10)  NOT NULL DEFAULT 'geral'
  CHECK (escopo IN ('geral','equipe','pessoa'));

CREATE TABLE IF NOT EXISTS evento_equipes (
  evento_id BIGINT NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  equipe_id BIGINT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  PRIMARY KEY (evento_id, equipe_id)
);

-- Evento automático ao concluir: no máximo 1 por (meta, dia) — idempotente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_evento_por_meta_dia
  ON eventos (meta_id, (inicio::date)) WHERE meta_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. NOTIFICAÇÕES (sino)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacoes (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo          VARCHAR(24)  NOT NULL,   -- evento | meta | aviso_pessoal
  titulo        VARCHAR(200) NOT NULL,
  mensagem      VARCHAR(500) NULL,
  referencia_id BIGINT       NULL,
  url           VARCHAR(300) NULL,
  lida          SMALLINT     NOT NULL DEFAULT 0,
  criado_em     TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_usuario
  ON notificacoes (usuario_id, lida, criado_em DESC);

-- ---------------------------------------------------------------------------
-- 7. COLUNAS/TRIGGERS que o código já usava
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meta_checklist' AND column_name = 'atualizado_em'
  ) THEN
    ALTER TABLE meta_checklist ADD COLUMN atualizado_em TIMESTAMP NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_atualizado_em() RETURNS trigger AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atrib_atualizado ON meta_atribuicoes;
CREATE TRIGGER trg_atrib_atualizado BEFORE UPDATE ON meta_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_checklist_atualizado ON meta_checklist;
CREATE TRIGGER trg_checklist_atualizado BEFORE UPDATE ON meta_checklist
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Status calculado no banco: não depende do PHP lembrar de atualizar.
CREATE OR REPLACE FUNCTION recalcular_status() RETURNS trigger AS $$
BEGIN
  IF NEW.progresso >= 100 THEN
    NEW.status := 'concluida';
    IF NEW.concluida_em IS NULL THEN NEW.concluida_em := now(); END IF;
  ELSE
    NEW.concluida_em := NULL;
    NEW.status := CASE WHEN NEW.progresso > 0 THEN 'em_andamento' ELSE 'a_fazer' END;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atrib_status ON meta_atribuicoes;
CREATE TRIGGER trg_atrib_status BEFORE INSERT OR UPDATE OF progresso ON meta_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION recalcular_status();

-- ---------------------------------------------------------------------------
-- 8. RLS nas tabelas novas (mesma política do database.sql: bloquear a API
--    pública do Supabase; o app conecta como postgres e não é afetado)
-- ---------------------------------------------------------------------------
ALTER TABLE funcoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipe_membros   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_atribuicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_anexos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_equipes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. View do dashboard: agregação no banco, não no PHP
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_equipe_desempenho;
CREATE VIEW vw_equipe_desempenho AS
SELECT e.id   AS equipe_id,
       e.nome AS equipe_nome,
       u.id   AS usuario_id,
       u.nome AS usuario_nome,
       f.nome AS funcao,
       COUNT(a.id)                                       AS total_metas,
       COUNT(*) FILTER (WHERE a.status = 'concluida')    AS concluidas,
       COUNT(*) FILTER (WHERE a.status = 'em_andamento') AS em_andamento,
       COUNT(*) FILTER (WHERE a.status = 'atrasada')     AS atrasadas,
       COALESCE(ROUND(AVG(a.progresso), 2), 0)           AS progresso_medio
FROM equipes e
JOIN equipe_membros em ON em.equipe_id = e.id
JOIN usuarios u        ON u.id = em.usuario_id AND u.ativo = 1
LEFT JOIN funcoes f    ON f.id = u.funcao_id
LEFT JOIN meta_atribuicoes a ON a.usuario_id = u.id
GROUP BY e.id, e.nome, u.id, u.nome, f.nome;

-- ============================================================================
-- VERIFICAÇÃO (rode depois; os três devem devolver linhas):
--   SELECT COUNT(*) FROM meta_atribuicoes;
--   SELECT * FROM vw_equipe_desempenho LIMIT 5;
--   SELECT proname FROM pg_proc WHERE proname IN ('recalcular_status','set_atualizado_em');
-- ============================================================================
