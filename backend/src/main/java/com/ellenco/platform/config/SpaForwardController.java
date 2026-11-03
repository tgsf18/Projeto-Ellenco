package com.ellenco.platform.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    /**
     * Encaminha requisições de páginas do frontend React (rotas sem extensão que não são /api nem /actuator)
     * diretamente para o index.html, garantindo que o F5 / refresh no navegador funcione perfeitamente.
     */
    @GetMapping(value = {
        "/{path:[^\\.]*}",
        "/*/{path:[^\\.]*}",
        "/*/*/{path:[^\\.]*}"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
