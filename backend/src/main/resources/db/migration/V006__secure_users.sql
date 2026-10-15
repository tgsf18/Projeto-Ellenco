DELETE FROM usuarios WHERE email IN ('admin@ellenco.com','supervisor@ellenco.com','funcionario@ellenco.com');
ALTER TABLE usuarios ALTER COLUMN cpf SET NOT NULL;
ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_cpf UNIQUE(cpf);
CREATE TABLE password_reset_tokens(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,token_hash VARCHAR(64) NOT NULL UNIQUE,expires_at TIMESTAMP NOT NULL,used_at TIMESTAMP,created_at TIMESTAMP NOT NULL);
CREATE INDEX idx_password_reset_expiry ON password_reset_tokens(expires_at);
