package com.ellenco.platform.domain;
import jakarta.persistence.*;
@Entity @Table(name="funcionarios")
public class Employee {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String nome; @Column(nullable=false,unique=true) private String cpf;
 @Column(unique=true) private String matricula; private String funcao; private String telefone; private String status="ATIVO";
 @ManyToOne private ConstructionSite obra;
 public Long getId(){return id;} public void setId(Long v){id=v;} public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getCpf(){return cpf;} public void setCpf(String v){cpf=v;} public String getMatricula(){return matricula;} public void setMatricula(String v){matricula=v;} public String getFuncao(){return funcao;} public void setFuncao(String v){funcao=v;} public String getTelefone(){return telefone;} public void setTelefone(String v){telefone=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public ConstructionSite getObra(){return obra;} public void setObra(ConstructionSite v){obra=v;}
}
