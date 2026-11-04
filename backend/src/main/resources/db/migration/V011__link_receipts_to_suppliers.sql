ALTER TABLE recebimentos ADD COLUMN fornecedor_id BIGINT REFERENCES fornecedores(id);
CREATE INDEX idx_recebimentos_fornecedor_id ON recebimentos(fornecedor_id);
