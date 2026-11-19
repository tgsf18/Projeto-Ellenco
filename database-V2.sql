-- ============================================================================
-- ELLENCO — Migração V2
-- Complementa a V1. O que entra aqui:
--   1. metadados de anexo (tipo real, tamanho, descrição) para exibir PDF,
--      imagem, planilha, executável — qualquer arquivo — com o ícone certo;
--   2. eventos com mais informação (fim, local, link, autor visível);
--   3. busca textual: índices GIN trigram para ILIKE '%termo%' rápido em
--      metas, usuários, equipes, eventos, funções e anexos;
--   4. notificações com chave de deduplicação;
--   5. views de apoio para os modais de detalhe.
--
-- Idempotente: pode rodar quantas vezes quiser.
-- Aplicar em: Supabase → SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensão de busca por similaridade (trigram). Se o plano do Supabase não
--    permitir, o bloco ignora e a busca cai para ILIKE sem índice — continua
--    funcionando, só um pouco mais lenta.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm indisponível (%); a busca seguirá com ILIKE sem índice.', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 1. ANEXOS — qualquer arquivo, com metadados para exibir sem baixar
-- ---------------------------------------------------------------------------
ALTER TABLE meta_anexos ADD COLUMN IF NOT EXISTS descricao VARCHAR(255) NULL;
ALTER TABLE meta_anexos ADD COLUMN IF NOT EXISTS extensao  VARCHAR(12)  NULL;
ALTER TABLE meta_anexos ADD COLUMN IF NOT EXISTS categoria VARCHAR(16)  NULL;

-- categoria derivada do mime/extensão: imagem, pdf, planilha, documento,
-- apresentacao, video, audio, arquivo (qualquer outro), link
CREATE OR REPLACE FUNCTION ellenco_categoria_anexo(p_mime text, p_ext text)
RETURNS text AS $$
DECLARE
  m text := lower(coalesce(p_mime, ''));
  e text := lower(coalesce(p_ext, ''));
BEGIN
  IF m = 'link' OR e = 'link' THEN RETURN 'link'; END IF;
  IF m LIKE 'image/%' THEN RETURN 'imagem'; END IF;
  IF m = 'application/pdf' OR e = 'pdf' THEN RETURN 'pdf'; END IF;
  IF m LIKE '%spreadsheet%' OR m LIKE '%excel%' OR e IN ('xls','xlsx','csv','ods') THEN RETURN 'planilha'; END IF;
  IF m LIKE '%presentation%' OR m LIKE '%powerpoint%' OR e IN ('ppt','pptx','odp') THEN RETURN 'apresentacao'; END IF;
  IF m LIKE 'video/%' OR e IN ('mp4','mov','avi','mkv','webm') THEN RETURN 'video'; END IF;
  IF m LIKE 'audio/%' OR e IN ('mp3','wav','ogg','m4a') THEN RETURN 'audio'; END IF;
  IF m LIKE '%word%' OR m LIKE 'text/%' OR e IN ('doc','docx','odt','txt','rtf','md') THEN RETURN 'documento'; END IF;
  IF e IN ('zip','rar','7z','gz','tar') THEN RETURN 'compactado'; END IF;
  IF e IN ('exe','msi','bat','sh','apk','dmg') THEN RETURN 'executavel'; END IF;
  RETURN 'arquivo';
END $$ LANGUAGE plpgsql IMMUTABLE;

-- preenche o que já existe
UPDATE meta_anexos
SET extensao = CASE
        WHEN url ~ '\.([A-Za-z0-9]{1,12})(\?|#|$)' THEN lower(substring(url from '\.([A-Za-z0-9]{1,12})(?:\?|#|$)'))
        ELSE NULL END
WHERE extensao IS NULL;

UPDATE meta_anexos
SET categoria = ellenco_categoria_anexo(mime, extensao)
WHERE categoria IS NULL;

-- trigger para manter categoria/extensao sempre coerentes em inserts novos
CREATE OR REPLACE FUNCTION trg_anexo_categoria() RETURNS trigger AS $$
BEGIN
  IF NEW.extensao IS NULL AND NEW.url ~ '\.([A-Za-z0-9]{1,12})(\?|#|$)' THEN
    NEW.extensao := lower(substring(NEW.url from '\.([A-Za-z0-9]{1,12})(?:\?|#|$)'));
  END IF;
  NEW.categoria := ellenco_categoria_anexo(NEW.mime, NEW.extensao);
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meta_anexos_categoria ON meta_anexos;
CREATE TRIGGER trg_meta_anexos_categoria
  BEFORE INSERT OR UPDATE ON meta_anexos
  FOR EACH ROW EXECUTE FUNCTION trg_anexo_categoria();

-- ---------------------------------------------------------------------------
-- 2. EVENTOS — informação completa no modal de detalhe
-- ---------------------------------------------------------------------------
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS fim           TIMESTAMP    NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS local         VARCHAR(200) NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS link          VARCHAR(1000) NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS participantes VARCHAR(500) NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP    NOT NULL DEFAULT now();

-- quem criou precisa ser exibível: o modal mostra nome e data
CREATE INDEX IF NOT EXISTS idx_eventos_criado_por ON eventos (criado_por);
CREATE INDEX IF NOT EXISTS idx_eventos_inicio     ON eventos (inicio DESC);

DROP TRIGGER IF EXISTS trg_eventos_atualizado ON eventos;
CREATE TRIGGER trg_eventos_atualizado BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ---------------------------------------------------------------------------
-- 3. BUSCA — índices trigram (ILIKE '%termo%' indexado)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_metas_titulo_trgm
    ON metas USING gin (titulo gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_metas_descricao_trgm
    ON metas USING gin (descricao gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_usuarios_nome_trgm
    ON usuarios USING gin (nome gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_usuarios_email_trgm
    ON usuarios USING gin (email gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_equipes_nome_trgm
    ON equipes USING gin (nome gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_eventos_titulo_trgm
    ON eventos USING gin (titulo gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_funcoes_nome_trgm
    ON funcoes USING gin (nome gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_anexos_nome_trgm
    ON meta_anexos USING gin (nome gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Índices trigram não criados (%); a busca seguirá por ILIKE.', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 4. NOTIFICAÇÕES — sem duplicar o mesmo aviso
-- ---------------------------------------------------------------------------
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS chave VARCHAR(120) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacao_chave
  ON notificacoes (usuario_id, chave) WHERE chave IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Views de apoio (agregação no banco, nunca no PHP)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_meta_detalhe;
CREATE VIEW vw_meta_detalhe AS
SELECT m.id,
       m.titulo,
       m.descricao,
       m.setor,
       m.semana_inicio,
       m.semana_fim,
       m.prioridade,
       m.status,
       m.criada_por,
       uc.nome AS criada_por_nome,
       m.criado_em,
       (SELECT COUNT(*) FROM meta_anexos ax WHERE ax.meta_id = m.id)          AS total_anexos,
       (SELECT COUNT(*) FROM meta_atribuicoes a WHERE a.meta_id = m.id)       AS total_pessoas,
       (SELECT COUNT(*) FROM meta_atribuicoes a
          WHERE a.meta_id = m.id AND a.status = 'concluida')                  AS total_concluidas,
       (SELECT COALESCE(ROUND(AVG(a.progresso), 0), 0) FROM meta_atribuicoes a
          WHERE a.meta_id = m.id)                                             AS progresso_medio,
       (m.semana_fim < CURRENT_DATE
          AND EXISTS (SELECT 1 FROM meta_atribuicoes a
                      WHERE a.meta_id = m.id AND a.status <> 'concluida'))    AS atrasada
FROM metas m
LEFT JOIN usuarios uc ON uc.id = m.criada_por;

DROP VIEW IF EXISTS vw_evento_detalhe;
CREATE VIEW vw_evento_detalhe AS
SELECT e.id,
       e.titulo,
       e.descricao,
       e.inicio,
       e.fim,
       e.dia_inteiro,
       e.local,
       e.link,
       e.participantes,
       e.categoria,
       e.escopo,
       e.setor,
       e.criado_por,
       uc.nome AS criado_por_nome,
       e.criado_em,
       e.equipe_id,
       eq.nome AS equipe_nome,
       e.usuario_id,
       uu.nome AS usuario_nome,
       e.meta_id,
       m.titulo AS meta_titulo
FROM eventos e
LEFT JOIN usuarios uc ON uc.id = e.criado_por
LEFT JOIN equipes  eq ON eq.id = e.equipe_id
LEFT JOIN usuarios uu ON uu.id = e.usuario_id
LEFT JOIN metas    m  ON m.id  = e.meta_id;

DROP VIEW IF EXISTS vw_usuario_resumo;
CREATE VIEW vw_usuario_resumo AS
SELECT u.id,
       u.nome,
       u.email,
       u.tipo_acesso,
       u.setor,
       u.ativo,
       u.funcao_id,
       f.nome AS funcao,
       u.criado_em,
       (SELECT COUNT(*) FROM equipe_membros em WHERE em.usuario_id = u.id) AS total_equipes,
       (SELECT COUNT(*) FROM meta_atribuicoes a WHERE a.usuario_id = u.id) AS total_metas,
       (SELECT COUNT(*) FROM meta_atribuicoes a
          WHERE a.usuario_id = u.id AND a.status = 'concluida')            AS metas_concluidas,
       (SELECT COALESCE(ROUND(AVG(a.progresso), 0), 0) FROM meta_atribuicoes a
          WHERE a.usuario_id = u.id)                                       AS progresso_medio
FROM usuarios u
LEFT JOIN funcoes f ON f.id = u.funcao_id;

-- ---------------------------------------------------------------------------
-- 6. RLS nas tabelas que a V2 tocou (o app conecta como postgres e não é
--    afetado; isto bloqueia a API pública do Supabase)
-- ---------------------------------------------------------------------------
ALTER TABLE meta_anexos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONFERÊNCIA (cada um deve devolver linhas):
--   SELECT categoria, COUNT(*) FROM meta_anexos GROUP BY 1;
--   SELECT id, titulo, criado_por_nome FROM vw_evento_detalhe LIMIT 5;
--   SELECT id, nome, total_metas, progresso_medio FROM vw_usuario_resumo LIMIT 5;
--   SELECT id, titulo, total_anexos, progresso_medio FROM vw_meta_detalhe LIMIT 5;
-- ============================================================================
