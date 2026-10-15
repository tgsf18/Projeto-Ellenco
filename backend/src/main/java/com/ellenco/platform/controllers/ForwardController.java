package com.ellenco.platform.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ForwardController {
    @RequestMapping(value = "{path?:^(?!api|h2-console|actuator)[^\\.]*}")
    public String forward() {
        return "forward:/index.html";
    }
}
