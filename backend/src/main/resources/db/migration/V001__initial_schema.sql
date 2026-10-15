CREATE TABLE obras (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(255) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  endereco VARCHAR(255), responsavel VARCHAR(255), status VARCHAR(50)
);

CREATE TABLE galpoes (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255), codigo VARCHAR(255), endereco VARCHAR(255), responsavel VARCHAR(255),
  status VARCHAR(50), capacidade INTEGER, obra_id BIGINT REFERENCES obras(id), created_at TIMESTAMP
);

CREATE TABLE categorias (
  id BIGSERIAL PRIMARY KEY, nome VARCHAR(255), descricao VARCHAR(255), created_at TIMESTAMP
);

CREATE TABLE produtos (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(255) NOT NULL UNIQUE, nome VARCHAR(255) NOT NULL, descricao VARCHAR(255),
  categoria_id BIGINT REFERENCES categorias(id), galpao_id BIGINT REFERENCES galpoes(id), unidade VARCHAR(40),
  quantidade_atual NUMERIC(19,2) NOT NULL DEFAULT 0, quantidade_minima NUMERIC(19,2) NOT NULL DEFAULT 0,
  lote VARCHAR(255), data_validade DATE, preco_unitario NUMERIC(19,2) DEFAULT 0, is_epi BOOLEAN NOT NULL DEFAULT FALSE,
  numero_ca VARCHAR(255), localizacao_prateleira VARCHAR(255), created_at TIMESTAMP, updated_at TIMESTAMP
);

CREATE TABLE fornecedores (
  id BIGSERIAL PRIMARY KEY, cnpj VARCHAR(255) NOT NULL UNIQUE, razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255), contato VARCHAR(255), telefone VARCHAR(255), email VARCHAR(255), status VARCHAR(50)
);

CREATE TABLE funcionarios (
  id BIGSERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, cpf VARCHAR(255) NOT NULL UNIQUE,
  matricula VARCHAR(255) UNIQUE, funcao VARCHAR(255), telefone VARCHAR(255), status VARCHAR(50), obra_id BIGINT REFERENCES obras(id)
);

CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL, cpf VARCHAR(255), telefone VARCHAR(255),
  obra VARCHAR(255), matricula VARCHAR(255), avatar TEXT, ativo BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP
);

CREATE TABLE recebimentos (
  id BIGSERIAL PRIMARY KEY, numero_nota VARCHAR(255) NOT NULL, fornecedor VARCHAR(255) NOT NULL,
  transportadora VARCHAR(255), galpao_destino_nome VARCHAR(255), galpao_id BIGINT,
  data_recebimento TIMESTAMP, data_conferencia TIMESTAMP, responsavel_recebimento VARCHAR(255),
  responsavel_conferencia VARCHAR(255), status VARCHAR(60) NOT NULL, observacoes VARCHAR(2000),
  foto_comprovante_url TEXT, created_at TIMESTAMP
);

CREATE TABLE recebimento_itens (
  id BIGSERIAL PRIMARY KEY, receipt_id BIGINT REFERENCES recebimentos(id) ON DELETE CASCADE,
  produto_id BIGINT, produto_codigo VARCHAR(255), produto_nome VARCHAR(255), unidade VARCHAR(40),
  lote VARCHAR(255), data_validade DATE, quantidade_nota NUMERIC(19,2) NOT NULL DEFAULT 0,
  quantidade_conferida NUMERIC(19,2) NOT NULL DEFAULT 0, status_item VARCHAR(60) NOT NULL,
  motivo_divergencia VARCHAR(255)
);

CREATE TABLE movimentacoes (
  id BIGSERIAL PRIMARY KEY, produto_id BIGINT REFERENCES produtos(id), produto_nome VARCHAR(255),
  produto_codigo VARCHAR(255), tipo VARCHAR(60) NOT NULL, quantidade NUMERIC(19,2) NOT NULL,
  origem VARCHAR(255), destino VARCHAR(255), responsavel VARCHAR(255), motivo VARCHAR(255),
  observacao VARCHAR(255), created_at TIMESTAMP
);

CREATE TABLE saldos_estoque (
  id BIGSERIAL PRIMARY KEY, produto_id BIGINT NOT NULL REFERENCES produtos(id), galpao_id BIGINT NOT NULL REFERENCES galpoes(id),
  lote VARCHAR(255) NOT NULL, data_validade DATE, quantidade_atual NUMERIC(19,2) NOT NULL DEFAULT 0,
  quantidade_minima NUMERIC(19,2) NOT NULL DEFAULT 0, localizacao_prateleira VARCHAR(255),
  CONSTRAINT uk_saldo_produto_galpao_lote UNIQUE(produto_id, galpao_id, lote)
);

CREATE TABLE epi_entregas (
  id BIGSERIAL PRIMARY KEY, funcionario_id BIGINT, funcionario_nome VARCHAR(255) NOT NULL,
  funcionario_matricula VARCHAR(255), funcionario_cpf VARCHAR(255), produto_id BIGINT,
  produto_nome VARCHAR(255) NOT NULL, numero_ca VARCHAR(255), quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega TIMESTAMP, data_previsao_troca DATE, data_devolucao TIMESTAMP, condicao_item VARCHAR(60),
  status VARCHAR(60) NOT NULL, termo_assinado BOOLEAN NOT NULL DEFAULT FALSE, assinatura_digital TEXT,
  responsavel_entrega VARCHAR(255), observacoes VARCHAR(2000), created_at TIMESTAMP
);

CREATE TABLE logs_auditoria (
  id BIGSERIAL PRIMARY KEY, usuario_nome VARCHAR(255), usuario_email VARCHAR(255), modulo VARCHAR(100),
  acao VARCHAR(100), entidade VARCHAR(255), registro_id VARCHAR(255), detalhes VARCHAR(2000), data_hora TIMESTAMP
);

CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_movimentacoes_created_at ON movimentacoes(created_at);
CREATE INDEX idx_recebimentos_status ON recebimentos(status);
CREATE INDEX idx_epi_funcionario_cpf ON epi_entregas(funcionario_cpf);
CREATE INDEX idx_logs_auditoria_data_hora ON logs_auditoria(data_hora);
