package com.ellenco.platform.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ForwardController {

    // Adicionado "assets" na lista de negação para o Java não sequestrar o CSS/JS do React
    @RequestMapping(value = "/{path:^(?!api|h2-console|actuator|assets|static)[^\\.]*}/**")
    public String forwardDeepPaths() {
        return "forward:/index.html";
    }

    @RequestMapping(value = "/{path:^(?!api|h2-console|actuator|assets|static)[^\\.]*}")
    public String forwardSinglePath() {
        return "forward:/index.html";
    }
}
