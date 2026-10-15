package com.ellenco.platform.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "logs_auditoria")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String usuarioNome;
    private String usuarioEmail;
    private String modulo;
    private String acao;
    private String entidade;
    private String registroId;

    @Column(length = 2000)
    private String detalhes;

    private LocalDateTime dataHora = LocalDateTime.now();

    public AuditLog() {}

    public AuditLog(String usuarioNome, String usuarioEmail, String modulo, String acao, String entidade, String registroId, String detalhes) {
        this.usuarioNome = usuarioNome;
        this.usuarioEmail = usuarioEmail;
        this.modulo = modulo;
        this.acao = acao;
        this.entidade = entidade;
        this.registroId = registroId;
        this.detalhes = detalhes;
        this.dataHora = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsuarioNome() { return usuarioNome; }
    public void setUsuarioNome(String usuarioNome) { this.usuarioNome = usuarioNome; }

    public String getUsuarioEmail() { return usuarioEmail; }
    public void setUsuarioEmail(String usuarioEmail) { this.usuarioEmail = usuarioEmail; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public String getAcao() { return acao; }
    public void setAcao(String acao) { this.acao = acao; }

    public String getEntidade() { return entidade; }
    public void setEntidade(String entidade) { this.entidade = entidade; }

    public String getRegistroId() { return registroId; }
    public void setRegistroId(String registroId) { this.registroId = registroId; }

    public String getDetalhes() { return detalhes; }
    public void setDetalhes(String detalhes) { this.detalhes = detalhes; }

    public LocalDateTime getDataHora() { return dataHora; }
    public void setDataHora(LocalDateTime dataHora) { this.dataHora = dataHora; }
}
