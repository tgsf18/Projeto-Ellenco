CREATE TABLE epi_solicitacoes (
    id BIGSERIAL PRIMARY KEY,
    funcionario_id BIGINT NOT NULL REFERENCES funcionarios(id),
    produto_id BIGINT NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    motivo VARCHAR(2000) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDENTE',
    solicitada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    analisada_por_id BIGINT REFERENCES usuarios(id),
    analisada_por_nome VARCHAR(255),
    analisada_em TIMESTAMP,
    observacao_decisao VARCHAR(2000),
    entrega_id BIGINT REFERENCES epi_entregas(id),
    CONSTRAINT ck_epi_solicitacao_status CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA'))
);

CREATE INDEX idx_epi_solicitacoes_status_data ON epi_solicitacoes(status, solicitada_em DESC);
CREATE INDEX idx_epi_solicitacoes_funcionario_data ON epi_solicitacoes(funcionario_id, solicitada_em DESC);
