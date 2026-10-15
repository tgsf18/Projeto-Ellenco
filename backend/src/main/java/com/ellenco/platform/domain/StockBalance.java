package com.ellenco.platform.domain;
import jakarta.persistence.*; import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name="saldos_estoque",uniqueConstraints=@UniqueConstraint(columnNames={"produto_id","galpao_id","lote","localizacao_prateleira"}))
public class StockBalance {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(optional=false) @JoinColumn(name="produto_id") private Product produto;
 @ManyToOne(optional=false) @JoinColumn(name="galpao_id") private Warehouse galpao;
 @Column(nullable=false) private String lote; private LocalDate dataValidade;
 @Column(nullable=false,precision=19,scale=2) private BigDecimal quantidadeAtual=BigDecimal.ZERO;
 @Column(nullable=false,precision=19,scale=2) private BigDecimal quantidadeReservada=BigDecimal.ZERO;
 @Column(nullable=false,precision=19,scale=2) private BigDecimal quantidadeBloqueada=BigDecimal.ZERO;
 @Column(nullable=false,precision=19,scale=2) private BigDecimal quantidadeMinima=BigDecimal.ZERO;
 @Column(nullable=false) private String localizacaoPrateleira="NAO_ENDERECADO";
 @Column(nullable=false) private String status="DISPONIVEL";
 @Version private Long version;
 public Long getId(){return id;} public void setId(Long v){id=v;} public Product getProduto(){return produto;} public void setProduto(Product v){produto=v;} public Warehouse getGalpao(){return galpao;} public void setGalpao(Warehouse v){galpao=v;} public String getLote(){return lote;} public void setLote(String v){lote=v;} public LocalDate getDataValidade(){return dataValidade;} public void setDataValidade(LocalDate v){dataValidade=v;} public BigDecimal getQuantidadeAtual(){return quantidadeAtual;} public void setQuantidadeAtual(BigDecimal v){quantidadeAtual=v;} public BigDecimal getQuantidadeReservada(){return quantidadeReservada;} public void setQuantidadeReservada(BigDecimal v){quantidadeReservada=v;} public BigDecimal getQuantidadeBloqueada(){return quantidadeBloqueada;} public void setQuantidadeBloqueada(BigDecimal v){quantidadeBloqueada=v;} public BigDecimal getQuantidadeDisponivel(){return quantidadeAtual.subtract(quantidadeReservada).subtract(quantidadeBloqueada);} public BigDecimal getQuantidadeMinima(){return quantidadeMinima;} public void setQuantidadeMinima(BigDecimal v){quantidadeMinima=v;} public String getLocalizacaoPrateleira(){return localizacaoPrateleira;} public void setLocalizacaoPrateleira(String v){localizacaoPrateleira=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public Long getVersion(){return version;}
}
