-- Esquema PostgreSQL (Supabase). Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  tipo_acesso VARCHAR(10) NOT NULL DEFAULT 'usuario' CHECK (tipo_acesso IN ('usuario','admin')),
  setor VARCHAR(20) NOT NULL CHECK (setor IN ('engenharia','administrativo','obras')),
  ativo SMALLINT NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NULL,
  setor VARCHAR(20) NOT NULL CHECK (setor IN ('engenharia','administrativo','obras')),
  semana_inicio DATE NOT NULL,
  semana_fim DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer','em_andamento','concluida')),
  progresso_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  criada_por BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  criado_em TIMESTAMP NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metas_setor_semana ON metas (setor, semana_inicio);

CREATE TABLE IF NOT EXISTS meta_atualizacoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meta_id BIGINT NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  progresso_percentual DECIMAL(5,2) NOT NULL,
  comentario TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_atualizacoes ON meta_atualizacoes (meta_id, criado_em);

CREATE TABLE IF NOT EXISTS meta_checklist (
  meta_id BIGINT NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  concluida SMALLINT NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (meta_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS eventos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NULL,
  setor VARCHAR(20) NOT NULL CHECK (setor IN ('engenharia','administrativo','obras')),
  inicio TIMESTAMP NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'outros',
  criado_por BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  criado_em TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_setor_inicio ON eventos (setor, inicio);

-- Atualiza "atualizado_em" automaticamente (equivalente ao ON UPDATE do MySQL)
CREATE OR REPLACE FUNCTION set_atualizado_em() RETURNS trigger AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_metas_atualizado ON metas;
CREATE TRIGGER trg_metas_atualizado BEFORE UPDATE ON metas FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
DROP TRIGGER IF EXISTS trg_checklist_atualizado ON meta_checklist;
CREATE TRIGGER trg_checklist_atualizado BEFORE UPDATE ON meta_checklist FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- SEGURANÇA: o Supabase expõe as tabelas por uma API pública. Ativar RLS sem
-- políticas bloqueia esse acesso. O app PHP conecta como "postgres" e não é afetado.
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_atualizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
