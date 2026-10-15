package com.ellenco.platform.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ForwardController {

    // Captura qualquer rota profunda de subpastas do React Router (ex: /dashboard, /estoque/produtos)
    // Contanto que não seja uma chamada da API, Actuator, console do H2 ou um arquivo físico com ponto "."
    @RequestMapping(value = "/{path:^(?!api|h2-console|actuator)[^\\.]*}/**")
    public String forwardDeepPaths() {
        return "forward:/index.html";
    }

    // Captura rotas de primeiro nível que não possuem barras adicionais
    @RequestMapping(value = "/{path:^(?!api|h2-console|actuator)[^\\.]*}")
    public String forwardSinglePath() {
        return "forward:/index.html";
    }
}
