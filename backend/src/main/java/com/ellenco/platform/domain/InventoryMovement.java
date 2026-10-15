package com.ellenco.platform.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimentacoes")
public class InventoryMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "produto_id")
    private Product produto;

    private String produtoNome;
    private String produtoCodigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OperationType tipo;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal quantidade;

    private String origem;
    private String destino;
    private String responsavel;
    private String motivo;
    private String observacao;
    private Long saldoOrigemId;
    private Long saldoDestinoId;
    private String lote;
    private String localizacao;
    private Long obraId;
    private String eap;
    private String frenteServico;
    private String equipe;
    private String comprovanteCodigo;
    private Long movimentoOrigemId;
    private boolean estornado = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public InventoryMovement() {}

    public InventoryMovement(Product produto, OperationType tipo, BigDecimal quantidade, String origem, String destino, String responsavel, String motivo, String observacao) {
        this.produto = produto;
        if (produto != null) {
            this.produtoNome = produto.getNome();
            this.produtoCodigo = produto.getCodigo();
        }
        this.tipo = tipo;
        this.quantidade = quantidade;
        this.origem = origem;
        this.destino = destino;
        this.responsavel = responsavel;
        this.motivo = motivo;
        this.observacao = observacao;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Product getProduto() { return produto; }
    public void setProduto(Product produto) {
        this.produto = produto;
        if (produto != null) {
            this.produtoNome = produto.getNome();
            this.produtoCodigo = produto.getCodigo();
        }
    }

    public String getProdutoNome() { return produtoNome; }
    public void setProdutoNome(String produtoNome) { this.produtoNome = produtoNome; }

    public String getProdutoCodigo() { return produtoCodigo; }
    public void setProdutoCodigo(String produtoCodigo) { this.produtoCodigo = produtoCodigo; }

    public OperationType getTipo() { return tipo; }
    public void setTipo(OperationType tipo) { this.tipo = tipo; }

    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }

    public String getOrigem() { return origem; }
    public void setOrigem(String origem) { this.origem = origem; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getResponsavel() { return responsavel; }
    public void setResponsavel(String responsavel) { this.responsavel = responsavel; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }

    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getSaldoOrigemId(){return saldoOrigemId;} public void setSaldoOrigemId(Long v){saldoOrigemId=v;}
    public Long getSaldoDestinoId(){return saldoDestinoId;} public void setSaldoDestinoId(Long v){saldoDestinoId=v;}
    public String getLote(){return lote;} public void setLote(String v){lote=v;}
    public String getLocalizacao(){return localizacao;} public void setLocalizacao(String v){localizacao=v;}
    public Long getObraId(){return obraId;} public void setObraId(Long v){obraId=v;}
    public String getEap(){return eap;} public void setEap(String v){eap=v;}
    public String getFrenteServico(){return frenteServico;} public void setFrenteServico(String v){frenteServico=v;}
    public String getEquipe(){return equipe;} public void setEquipe(String v){equipe=v;}
    public String getComprovanteCodigo(){return comprovanteCodigo;} public void setComprovanteCodigo(String v){comprovanteCodigo=v;}
    public Long getMovimentoOrigemId(){return movimentoOrigemId;} public void setMovimentoOrigemId(Long v){movimentoOrigemId=v;}
    public boolean isEstornado(){return estornado;} public void setEstornado(boolean v){estornado=v;}
}
