package com.ellenco.platform.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@RestController @RequestMapping("/api/integrations") @PreAuthorize("hasRole('ADMIN')")
public class IntegrationController {
    private final Map<String,Connector> connectors;
    public IntegrationController(@Value("${integrations.erp.url:}")String erpUrl,@Value("${integrations.erp.token:}")String erpToken,@Value("${integrations.rh.url:}")String rhUrl,@Value("${integrations.rh.token:}")String rhToken,@Value("${integrations.sesmt.url:}")String sesmtUrl,@Value("${integrations.sesmt.token:}")String sesmtToken,@Value("${integrations.esocial.url:}")String esocialUrl,@Value("${integrations.esocial.token:}")String esocialToken){connectors=Map.of("erp",new Connector(erpUrl,erpToken),"rh",new Connector(rhUrl,rhToken),"sesmt",new Connector(sesmtUrl,sesmtToken),"esocial",new Connector(esocialUrl,esocialToken));}
    @GetMapping("/status") public List<Map<String,Object>> status(){return connectors.entrySet().stream().map(e->view(e.getKey(),e.getValue(),null)).toList();}
    @PostMapping("/{name}/test") public Map<String,Object> test(@PathVariable String name)throws Exception{Connector c=Optional.ofNullable(connectors.get(name.toLowerCase())).orElseThrow(()->new IllegalArgumentException("Conector desconhecido."));if(!c.ready())throw new IllegalArgumentException("Informe URL e credencial do conector no ambiente seguro.");URI uri=URI.create(c.url());if(!Set.of("https","http").contains(uri.getScheme()))throw new IllegalArgumentException("URL do conector inválida.");HttpRequest req=HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(8)).header(HttpHeaders.AUTHORIZATION,"Bearer "+c.token()).header("User-Agent","Ellenco-Platform/1.0").GET().build();HttpResponse<Void> res=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build().send(req,HttpResponse.BodyHandlers.discarding());return view(name,c,res.statusCode());}
    private Map<String,Object> view(String name,Connector c,Integer code){Map<String,Object>m=new LinkedHashMap<>();m.put("name",name.toUpperCase());m.put("configured",c.ready());m.put("url",safeHost(c.url()));m.put("credentialPresent",!c.token().isBlank());if(code!=null){m.put("httpStatus",code);m.put("reachable",code>=200&&code<500);}return m;}private String safeHost(String value){try{URI u=URI.create(value);return u.getScheme()+"://"+u.getHost();}catch(Exception e){return"";}}private record Connector(String url,String token){boolean ready(){return url!=null&&!url.isBlank()&&token!=null&&!token.isBlank();}}
}
