package com.ellenco.platform.controllers;

import com.ellenco.platform.domain.JobFunctionCatalog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/job-functions")
public class JobFunctionController {

    @GetMapping
    public List<String> list() {
        return JobFunctionCatalog.all();
    }
}
