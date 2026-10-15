package com.ellenco.platform.domain;
import jakarta.persistence.*;
@Entity @Table(name="obras")
public class ConstructionSite {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private String codigo;
 @Column(nullable=false) private String nome;
 private String endereco; private String responsavel; private String status="ATIVA";
 public Long getId(){return id;} public void setId(Long v){id=v;} public String getCodigo(){return codigo;} public void setCodigo(String v){codigo=v;} public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getEndereco(){return endereco;} public void setEndereco(String v){endereco=v;} public String getResponsavel(){return responsavel;} public void setResponsavel(String v){responsavel=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
}
