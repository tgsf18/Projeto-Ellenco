-- Migration V007: Índices de alta performance e compatibilidade com novos perfis AIR / CEO

CREATE INDEX IF NOT EXISTS idx_movimentacoes_created_at_desc ON movimentacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recebimentos_created_at_desc ON recebimentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recebimentos_status_data ON recebimentos(status, data_recebimento DESC);
CREATE INDEX IF NOT EXISTS idx_saldos_estoque_status_validade ON saldos_estoque(status, data_validade);
CREATE INDEX IF NOT EXISTS idx_saldos_estoque_galpao_prod ON saldos_estoque(galpao_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_epi_entregas_status_troca ON epi_entregas(status, data_previsao_troca);
CREATE INDEX IF NOT EXISTS idx_ferramenta_emprestimos_status ON ferramenta_emprestimos(status, devolucao_prevista);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_galpao ON produtos(galpao_id);
