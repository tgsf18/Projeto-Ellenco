package com.ellenco.platform.domain;
import jakarta.persistence.*;
@Entity @Table(name="fornecedores")
public class Supplier {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private String cnpj; @Column(nullable=false) private String razaoSocial;
 private String nomeFantasia; private String contato; private String telefone; private String email; private String status="ATIVO";
 public Long getId(){return id;} public void setId(Long v){id=v;} public String getCnpj(){return cnpj;} public void setCnpj(String v){cnpj=v;} public String getRazaoSocial(){return razaoSocial;} public void setRazaoSocial(String v){razaoSocial=v;} public String getNomeFantasia(){return nomeFantasia;} public void setNomeFantasia(String v){nomeFantasia=v;} public String getContato(){return contato;} public void setContato(String v){contato=v;} public String getTelefone(){return telefone;} public void setTelefone(String v){telefone=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
}
