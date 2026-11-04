ALTER TABLE ferramenta_emprestimos ADD COLUMN obra_id BIGINT REFERENCES obras(id);
CREATE INDEX idx_ferramenta_emprestimos_obra_id ON ferramenta_emprestimos(obra_id);
