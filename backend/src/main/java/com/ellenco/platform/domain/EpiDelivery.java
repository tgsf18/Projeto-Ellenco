package com.ellenco.platform.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "epi_entregas")
public class EpiDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long funcionarioId;

    @NotBlank
    @Column(nullable = false)
    private String funcionarioNome;

    private String funcionarioMatricula;
    @NotBlank(message = "CPF do funcionário é obrigatório")
    private String funcionarioCpf;

    private Long produtoId;

    @NotBlank
    @Column(nullable = false)
    private String produtoNome;

    @NotBlank(message = "Número do CA é obrigatório")
    private String numeroCa;

    @Min(value = 1, message = "A quantidade deve ser pelo menos 1")
    @Column(nullable = false)
    private Integer quantidade = 1;

    private LocalDateTime dataEntrega = LocalDateTime.now();
    @NotNull(message = "A previsão de troca é obrigatória")
    @FutureOrPresent(message = "A previsão de troca não pode estar no passado")
    private LocalDate dataPrevisaoTroca;
    private LocalDateTime dataDevolucao;

    private String condicaoItem = "NOVO"; // NOVO, BOM, REGULAR, AVARIADO

    @Column(nullable = false)
    private String status = "ENTREGUE"; // ENTREGUE, PENDENTE_ASSINATURA, DEVOLVIDO, VENCIDO

    private boolean termoAssinado = false;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String assinaturaDigital;

    private String responsavelEntrega;

    @Column(length = 2000)
    private String observacoes;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public EpiDelivery() {}

    public EpiDelivery(Long funcionarioId, String funcionarioNome, String funcionarioMatricula, Long produtoId, String produtoNome, String numeroCa, Integer quantidade, LocalDate dataPrevisaoTroca, String responsavelEntrega, boolean termoAssinado) {
        this.funcionarioId = funcionarioId;
        this.funcionarioNome = funcionarioNome;
        this.funcionarioMatricula = funcionarioMatricula;
        this.produtoId = produtoId;
        this.produtoNome = produtoNome;
        this.numeroCa = numeroCa;
        this.quantidade = quantidade;
        this.dataPrevisaoTroca = dataPrevisaoTroca;
        this.responsavelEntrega = responsavelEntrega;
        this.termoAssinado = termoAssinado;
        this.status = termoAssinado ? "ENTREGUE" : "PENDENTE_ASSINATURA";
        this.dataEntrega = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFuncionarioId() { return funcionarioId; }
    public void setFuncionarioId(Long funcionarioId) { this.funcionarioId = funcionarioId; }

    public String getFuncionarioNome() { return funcionarioNome; }
    public void setFuncionarioNome(String funcionarioNome) { this.funcionarioNome = funcionarioNome; }

    public String getFuncionarioMatricula() { return funcionarioMatricula; }
    public void setFuncionarioMatricula(String funcionarioMatricula) { this.funcionarioMatricula = funcionarioMatricula; }

    public String getFuncionarioCpf() { return funcionarioCpf; }
    public void setFuncionarioCpf(String funcionarioCpf) { this.funcionarioCpf = funcionarioCpf; }

    public Long getProdutoId() { return produtoId; }
    public void setProdutoId(Long produtoId) { this.produtoId = produtoId; }

    public String getProdutoNome() { return produtoNome; }
    public void setProdutoNome(String produtoNome) { this.produtoNome = produtoNome; }

    public String getNumeroCa() { return numeroCa; }
    public void setNumeroCa(String numeroCa) { this.numeroCa = numeroCa; }

    public Integer getQuantidade() { return quantidade; }
    public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }

    public LocalDateTime getDataEntrega() { return dataEntrega; }
    public void setDataEntrega(LocalDateTime dataEntrega) { this.dataEntrega = dataEntrega; }

    public LocalDate getDataPrevisaoTroca() { return dataPrevisaoTroca; }
    public void setDataPrevisaoTroca(LocalDate dataPrevisaoTroca) { this.dataPrevisaoTroca = dataPrevisaoTroca; }

    public LocalDateTime getDataDevolucao() { return dataDevolucao; }
    public void setDataDevolucao(LocalDateTime dataDevolucao) { this.dataDevolucao = dataDevolucao; }

    public String getCondicaoItem() { return condicaoItem; }
    public void setCondicaoItem(String condicaoItem) { this.condicaoItem = condicaoItem; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isTermoAssinado() { return termoAssinado; }
    public void setTermoAssinado(boolean termoAssinado) { this.termoAssinado = termoAssinado; }

    public String getAssinaturaDigital() { return assinaturaDigital; }
    public void setAssinaturaDigital(String assinaturaDigital) { this.assinaturaDigital = assinaturaDigital; }

    public String getResponsavelEntrega() { return responsavelEntrega; }
    public void setResponsavelEntrega(String responsavelEntrega) { this.responsavelEntrega = responsavelEntrega; }

    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Transient
    public boolean isVencido() {
        return dataPrevisaoTroca != null && dataPrevisaoTroca.isBefore(LocalDate.now()) && !"SUBSTITUIDO".equals(status);
    }

    @Transient
    public boolean isProximoVencimento() {
        LocalDate hoje = LocalDate.now();
        return dataPrevisaoTroca != null && !dataPrevisaoTroca.isBefore(hoje)
                && !dataPrevisaoTroca.isAfter(hoje.plusDays(30)) && !"SUBSTITUIDO".equals(status);
    }
}
