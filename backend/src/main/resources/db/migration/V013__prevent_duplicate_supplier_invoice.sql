CREATE UNIQUE INDEX uq_recebimentos_fornecedor_nota
    ON recebimentos (fornecedor_id, numero_nota)
    WHERE fornecedor_id IS NOT NULL;
