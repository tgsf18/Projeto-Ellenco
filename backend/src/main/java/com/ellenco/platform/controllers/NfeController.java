package com.ellenco.platform.controllers;

import com.ellenco.platform.domain.Product;
import com.ellenco.platform.domain.ProductRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.*;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/api/nfe") @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
public class NfeController {
    private final ProductRepository products;
    public NfeController(ProductRepository products){this.products=products;}

    @PostMapping(value="/import",consumes="multipart/form-data")
    public Map<String,Object> parse(@RequestPart("file") MultipartFile file) throws Exception {
        if(file.isEmpty()||file.getSize()>5_000_000) throw new IllegalArgumentException("XML vazio ou maior que 5 MB.");
        if(file.getOriginalFilename()!=null&&!file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xml")) throw new IllegalArgumentException("Envie um arquivo XML autorizado da NF-e.");
        DocumentBuilderFactory f=DocumentBuilderFactory.newInstance();f.setNamespaceAware(true);f.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);f.setFeature("http://xml.org/sax/features/external-general-entities",false);f.setFeature("http://xml.org/sax/features/external-parameter-entities",false);f.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD,"");f.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA,"");
        Document d;try(InputStream in=file.getInputStream()){d=f.newDocumentBuilder().parse(in);}d.getDocumentElement().normalize();
        String model=text(d,"mod"),number=text(d,"nNF"),supplier=text(first(d,"emit"),"xNome"),cnpj=text(first(d,"emit"),"CNPJ"),key=accessKey(d);
        if(!Set.of("55","65").contains(model)||number.isBlank()||supplier.isBlank()||key.length()!=44) throw new IllegalArgumentException("XML inválido: é necessário um documento NF-e/NFC-e modelo 55 ou 65 com chave de acesso.");
        String protocol=text(d,"nProt"),status=text(d,"cStat");if(!protocol.isBlank()&&!Set.of("100","150").contains(status))throw new IllegalArgumentException("NF-e não autorizada. Status SEFAZ: "+status+".");
        List<Map<String,Object>> lines=new ArrayList<>();NodeList det=d.getElementsByTagNameNS("*","det");BigDecimal itemsTotal=BigDecimal.ZERO;
        for(int x=0;x<det.getLength();x++){Element e=(Element)det.item(x);String code=text(e,"cProd"),name=text(e,"xProd"),unit=text(e,"uCom"),qty=text(e,"qCom"),value=text(e,"vProd");if(code.isBlank()||name.isBlank()||decimal(qty).signum()<=0)throw new IllegalArgumentException("Item "+(x+1)+" possui código, descrição ou quantidade inválida.");Optional<Product> p=products.findByCodigo(code);Map<String,Object> line=new LinkedHashMap<>();line.put("codigo",code);line.put("ean",firstNonBlank(text(e,"cEANTrib"),text(e,"cEAN")));line.put("nome",name);line.put("unidade",unit);line.put("quantidade",decimal(qty));line.put("valor",decimal(value));line.put("ncm",text(e,"NCM"));line.put("cfop",text(e,"CFOP"));line.put("cest",text(e,"CEST"));line.put("produtoId",p.map(Product::getId).orElse(null));line.put("cadastrado",p.isPresent());lines.add(line);itemsTotal=itemsTotal.add(decimal(value));}
        if(lines.isEmpty())throw new IllegalArgumentException("A nota não possui itens de produto.");BigDecimal declared=decimal(text(d,"vNF"));List<String>warnings=new ArrayList<>();if(declared.signum()>0&&itemsTotal.compareTo(declared)>0)warnings.add("A soma bruta dos itens supera o total da nota; revise descontos, frete e impostos.");if(protocol.isBlank())warnings.add("XML sem protocolo de autorização; confirme se não é apenas o XML de envio.");
        Map<String,Object> out=new LinkedHashMap<>();out.put("modelo",model);out.put("chaveAcesso",key);out.put("numeroNota",number);out.put("serie",text(d,"serie"));out.put("dataEmissao",firstNonBlank(text(d,"dhEmi"),text(d,"dEmi")));out.put("fornecedor",supplier);out.put("fornecedorCnpj",cnpj);out.put("valorTotal",declared);out.put("protocolo",protocol);out.put("itens",lines);out.put("quantidadeItens",lines.size());out.put("avisos",warnings);return out;
    }
    private Node first(Document d,String tag){NodeList n=d.getElementsByTagNameNS("*",tag);return n.getLength()==0?d:n.item(0);}private String text(Node n,String tag){NodeList l=n instanceof Document?((Document)n).getElementsByTagNameNS("*",tag):((Element)n).getElementsByTagNameNS("*",tag);return l.getLength()==0?"":l.item(0).getTextContent().trim();}private BigDecimal decimal(String v){try{return new BigDecimal(v.replace(',','.'));}catch(Exception e){return BigDecimal.ZERO;}}private String accessKey(Document d){NodeList n=d.getElementsByTagNameNS("*","infNFe");if(n.getLength()==0)return"";String id=((Element)n.item(0)).getAttribute("Id");return id.startsWith("NFe")?id.substring(3):id;}private String firstNonBlank(String a,String b){return a==null||a.isBlank()?b:a;}
}
