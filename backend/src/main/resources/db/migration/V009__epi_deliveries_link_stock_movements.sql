ALTER TABLE epi_entregas ADD COLUMN saldo_estoque_id BIGINT REFERENCES saldos_estoque(id);
ALTER TABLE epi_entregas ADD COLUMN movimento_estoque_id BIGINT REFERENCES movimentacoes(id);
CREATE INDEX idx_epi_entregas_saldo_estoque ON epi_entregas(saldo_estoque_id);
CREATE INDEX idx_epi_entregas_movimento_estoque ON epi_entregas(movimento_estoque_id);
