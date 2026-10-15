package com.ellenco.platform.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "recebimento_itens")
public class ReceiptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    @JsonBackReference
    private Receipt receipt;

    private Long produtoId;
    private String produtoCodigo;
    private String produtoNome;
    private String unidade = "UN";
    private String lote;
    private LocalDate dataValidade;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal quantidadeNota = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal quantidadeConferida = BigDecimal.ZERO;

    @Column(nullable = false)
    private String statusItem = "PENDENTE"; // PENDENTE, CONFERIDO_OK, DIVERGENCIA, AVARIADO

    private String motivoDivergencia;

    public ReceiptItem() {}

    public ReceiptItem(Long produtoId, String produtoCodigo, String produtoNome, String unidade, BigDecimal quantidadeNota) {
        this.produtoId = produtoId;
        this.produtoCodigo = produtoCodigo;
        this.produtoNome = produtoNome;
        this.unidade = unidade;
        this.quantidadeNota = quantidadeNota;
        this.quantidadeConferida = BigDecimal.ZERO;
        this.statusItem = "PENDENTE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Receipt getReceipt() { return receipt; }
    public void setReceipt(Receipt receipt) { this.receipt = receipt; }

    public Long getProdutoId() { return produtoId; }
    public void setProdutoId(Long produtoId) { this.produtoId = produtoId; }

    public String getProdutoCodigo() { return produtoCodigo; }
    public void setProdutoCodigo(String produtoCodigo) { this.produtoCodigo = produtoCodigo; }

    public String getProdutoNome() { return produtoNome; }
    public void setProdutoNome(String produtoNome) { this.produtoNome = produtoNome; }

    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }
    public String getLote() { return lote; }
    public void setLote(String lote) { this.lote = lote; }
    public LocalDate getDataValidade() { return dataValidade; }
    public void setDataValidade(LocalDate dataValidade) { this.dataValidade = dataValidade; }

    public BigDecimal getQuantidadeNota() { return quantidadeNota; }
    public void setQuantidadeNota(BigDecimal quantidadeNota) { this.quantidadeNota = quantidadeNota; }

    public BigDecimal getQuantidadeConferida() { return quantidadeConferida; }
    public void setQuantidadeConferida(BigDecimal quantidadeConferida) { this.quantidadeConferida = quantidadeConferida; }

    public String getStatusItem() { return statusItem; }
    public void setStatusItem(String statusItem) { this.statusItem = statusItem; }

    public String getMotivoDivergencia() { return motivoDivergencia; }
    public void setMotivoDivergencia(String motivoDivergencia) { this.motivoDivergencia = motivoDivergencia; }
}
