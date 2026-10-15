package com.ellenco.platform.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.FutureOrPresent;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "produtos")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true, nullable = false)
    private String codigo;

    @NotBlank
    @Column(nullable = false)
    private String nome;

    private String descricao;

    @ManyToOne
    @JoinColumn(name = "categoria_id")
    private Category categoria;

    @ManyToOne
    @JoinColumn(name = "galpao_id")
    private Warehouse galpao;

    private String unidade = "UN";

    @PositiveOrZero(message = "O saldo inicial não pode ser negativo")
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal quantidadeAtual = BigDecimal.ZERO;

    @PositiveOrZero(message = "O estoque mínimo não pode ser negativo")
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal quantidadeMinima = BigDecimal.ZERO;

    private String lote;

    @FutureOrPresent(message = "A validade do material não pode estar no passado")
    private LocalDate dataValidade;

    @Column(precision = 19, scale = 2)
    private BigDecimal precoUnitario = BigDecimal.ZERO;

    private boolean isEpi = false;

    private String numeroCa;

    private String localizacaoPrateleira;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Product() {}

    public Product(String codigo, String nome, Category categoria, Warehouse galpao, String unidade, BigDecimal quantidadeAtual, BigDecimal quantidadeMinima, boolean isEpi, String numeroCa) {
        this.codigo = codigo;
        this.nome = nome;
        this.categoria = categoria;
        this.galpao = galpao;
        this.unidade = unidade;
        this.quantidadeAtual = quantidadeAtual;
        this.quantidadeMinima = quantidadeMinima;
        this.isEpi = isEpi;
        this.numeroCa = numeroCa;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public Category getCategoria() { return categoria; }
    public void setCategoria(Category categoria) { this.categoria = categoria; }

    public Warehouse getGalpao() { return galpao; }
    public void setGalpao(Warehouse galpao) { this.galpao = galpao; }

    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }

    public BigDecimal getQuantidadeAtual() { return quantidadeAtual; }
    public void setQuantidadeAtual(BigDecimal quantidadeAtual) { this.quantidadeAtual = quantidadeAtual; }

    public BigDecimal getQuantidadeMinima() { return quantidadeMinima; }
    public void setQuantidadeMinima(BigDecimal quantidadeMinima) { this.quantidadeMinima = quantidadeMinima; }

    public String getLote() { return lote; }
    public void setLote(String lote) { this.lote = lote; }

    public LocalDate getDataValidade() { return dataValidade; }
    public void setDataValidade(LocalDate dataValidade) { this.dataValidade = dataValidade; }

    public BigDecimal getPrecoUnitario() { return precoUnitario; }
    public void setPrecoUnitario(BigDecimal precoUnitario) { this.precoUnitario = precoUnitario; }

    public boolean isEpi() { return isEpi; }
    public void setEpi(boolean epi) { isEpi = epi; }

    public String getNumeroCa() { return numeroCa; }
    public void setNumeroCa(String numeroCa) { this.numeroCa = numeroCa; }

    public String getLocalizacaoPrateleira() { return localizacaoPrateleira; }
    public void setLocalizacaoPrateleira(String localizacaoPrateleira) { this.localizacaoPrateleira = localizacaoPrateleira; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public boolean isBaixoEstoque() {
        return quantidadeAtual != null && quantidadeMinima != null && quantidadeAtual.compareTo(quantidadeMinima) <= 0;
    }
}
