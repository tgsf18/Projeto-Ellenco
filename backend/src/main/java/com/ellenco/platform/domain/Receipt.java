package com.ellenco.platform.domain;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recebimentos")
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String numeroNota;

    @NotBlank
    @Column(nullable = false)
    private String fornecedor;

    private String transportadora;
    private String galpaoDestinoNome;
    private Long galpaoId;

    private LocalDateTime dataRecebimento = LocalDateTime.now();
    private LocalDateTime dataConferencia;

    private String responsavelRecebimento;
    private String responsavelConferencia;

    @Column(nullable = false)
    private String status = "AGUARDANDO_CONFERENCIA";

    @Column(length = 2000)
    private String observacoes;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String fotoComprovanteUrl;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<ReceiptItem> itens = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Receipt() {}

    public Receipt(String numeroNota, String fornecedor, String transportadora, String galpaoDestinoNome, Long galpaoId, String responsavelRecebimento) {
        this.numeroNota = numeroNota;
        this.fornecedor = fornecedor;
        this.transportadora = transportadora;
        this.galpaoDestinoNome = galpaoDestinoNome;
        this.galpaoId = galpaoId;
        this.responsavelRecebimento = responsavelRecebimento;
        this.status = "AGUARDANDO_CONFERENCIA";
        this.dataRecebimento = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
    }

    public void addItem(ReceiptItem item) {
        itens.add(item);
        item.setReceipt(this);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroNota() { return numeroNota; }
    public void setNumeroNota(String numeroNota) { this.numeroNota = numeroNota; }

    public String getFornecedor() { return fornecedor; }
    public void setFornecedor(String fornecedor) { this.fornecedor = fornecedor; }

    public String getTransportadora() { return transportadora; }
    public void setTransportadora(String transportadora) { this.transportadora = transportadora; }

    public String getGalpaoDestinoNome() { return galpaoDestinoNome; }
    public void setGalpaoDestinoNome(String galpaoDestinoNome) { this.galpaoDestinoNome = galpaoDestinoNome; }

    public Long getGalpaoId() { return galpaoId; }
    public void setGalpaoId(Long galpaoId) { this.galpaoId = galpaoId; }

    public LocalDateTime getDataRecebimento() { return dataRecebimento; }
    public void setDataRecebimento(LocalDateTime dataRecebimento) { this.dataRecebimento = dataRecebimento; }

    public LocalDateTime getDataConferencia() { return dataConferencia; }
    public void setDataConferencia(LocalDateTime dataConferencia) { this.dataConferencia = dataConferencia; }

    public String getResponsavelRecebimento() { return responsavelRecebimento; }
    public void setResponsavelRecebimento(String responsavelRecebimento) { this.responsavelRecebimento = responsavelRecebimento; }

    public String getResponsavelConferencia() { return responsavelConferencia; }
    public void setResponsavelConferencia(String responsavelConferencia) { this.responsavelConferencia = responsavelConferencia; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }

    public String getFotoComprovanteUrl() { return fotoComprovanteUrl; }
    public void setFotoComprovanteUrl(String fotoComprovanteUrl) { this.fotoComprovanteUrl = fotoComprovanteUrl; }

    public List<ReceiptItem> getItens() { return itens; }
    public void setItens(List<ReceiptItem> itens) { this.itens = itens; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
