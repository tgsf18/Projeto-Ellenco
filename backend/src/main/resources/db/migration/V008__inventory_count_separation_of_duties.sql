ALTER TABLE inventarios ADD COLUMN iniciado_por_id BIGINT REFERENCES usuarios(id);
ALTER TABLE inventarios ADD COLUMN aprovado_por_id BIGINT REFERENCES usuarios(id);
CREATE INDEX idx_inventarios_iniciado_por ON inventarios(iniciado_por_id);
CREATE INDEX idx_inventarios_aprovado_por ON inventarios(aprovado_por_id);
