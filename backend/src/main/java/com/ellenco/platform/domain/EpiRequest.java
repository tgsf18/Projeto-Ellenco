package com.ellenco.platform.domain;

import com.ellenco.platform.auth.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "epi_solicitacoes")
public class EpiRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "funcionario_id", nullable = false)
    private Employee funcionario;
    @ManyToOne(optional = false) @JoinColumn(name = "produto_id", nullable = false)
    private Product produto;
    @Column(nullable = false) private Integer quantidade;
    @Column(nullable = false, length = 2000) private String motivo;
    @Column(nullable = false) private String status = "PENDENTE";
    @Column(name = "solicitada_em", nullable = false) private LocalDateTime solicitadaEm = LocalDateTime.now();
    @ManyToOne @JoinColumn(name = "analisada_por_id") private User analisadaPor;
    @Column(name = "analisada_por_nome") private String analisadaPorNome;
    @Column(name = "analisada_em") private LocalDateTime analisadaEm;
    @Column(name = "observacao_decisao", length = 2000) private String observacaoDecisao;
    @ManyToOne @JoinColumn(name = "entrega_id") private EpiDelivery entrega;

    public Long getId() { return id; }
    public Employee getFuncionario() { return funcionario; }
    public void setFuncionario(Employee funcionario) { this.funcionario = funcionario; }
    public Product getProduto() { return produto; }
    public void setProduto(Product produto) { this.produto = produto; }
    public Integer getQuantidade() { return quantidade; }
    public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getSolicitadaEm() { return solicitadaEm; }
    public User getAnalisadaPor() { return analisadaPor; }
    public void setAnalisadaPor(User analisadaPor) { this.analisadaPor = analisadaPor; }
    public String getAnalisadaPorNome() { return analisadaPorNome; }
    public void setAnalisadaPorNome(String analisadaPorNome) { this.analisadaPorNome = analisadaPorNome; }
    public LocalDateTime getAnalisadaEm() { return analisadaEm; }
    public void setAnalisadaEm(LocalDateTime analisadaEm) { this.analisadaEm = analisadaEm; }
    public String getObservacaoDecisao() { return observacaoDecisao; }
    public void setObservacaoDecisao(String observacaoDecisao) { this.observacaoDecisao = observacaoDecisao; }
    public EpiDelivery getEntrega() { return entrega; }
    public void setEntrega(EpiDelivery entrega) { this.entrega = entrega; }
}
