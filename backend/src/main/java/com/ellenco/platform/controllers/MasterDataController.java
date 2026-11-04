package com.ellenco.platform.controllers;

import com.ellenco.platform.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
public class MasterDataController {

    private final ConstructionSiteRepository obras;
    private final SupplierRepository fornecedores;
    private final EmployeeRepository funcionarios;

    public MasterDataController(ConstructionSiteRepository o, SupplierRepository f, EmployeeRepository e) {
        this.obras = o;
        this.fornecedores = f;
        this.funcionarios = e;
    }

    @GetMapping("/construction-sites")
    public List<ConstructionSite> obras() {
        return obras.findAll();
    }

    @PostMapping("/construction-sites")
    public ConstructionSite obra(@RequestBody ConstructionSite v) {
        if (v.getCodigo() == null || v.getCodigo().isBlank() || v.getNome() == null || v.getNome().isBlank()) {
            throw new IllegalArgumentException("Código e nome da obra são obrigatórios.");
        }
        v.setCodigo(v.getCodigo().trim().toUpperCase());
        v.setStatus(v.getStatus() == null || v.getStatus().isBlank() ? "ATIVA" : v.getStatus());
        return obras.save(v);
    }

    @PutMapping("/construction-sites/{id}")
    public ResponseEntity<ConstructionSite> obra(@PathVariable Long id, @RequestBody ConstructionSite v) {
        if (!obras.existsById(id)) return ResponseEntity.notFound().build();
        v.setId(id);
        return ResponseEntity.ok(obras.save(v));
    }

    @GetMapping("/suppliers")
    public List<Supplier> fornecedores() {
        return fornecedores.findAll();
    }

    @PostMapping("/suppliers")
    public Supplier fornecedor(@RequestBody Supplier v) {
        if (v.getCnpj() == null || v.getCnpj().isBlank() || v.getRazaoSocial() == null || v.getRazaoSocial().isBlank()) {
            throw new IllegalArgumentException("CNPJ e razão social são obrigatórios.");
        }
        v.setCnpj(v.getCnpj().replaceAll("\\D", ""));
        if (fornecedores.existsByCnpj(v.getCnpj())) {
            throw new IllegalArgumentException("Este CNPJ já está cadastrado. Selecione o fornecedor existente.");
        }
        return fornecedores.save(v);
    }

    @PutMapping("/suppliers/{id}")
    public ResponseEntity<Supplier> fornecedor(@PathVariable Long id, @RequestBody Supplier v) {
        if (!fornecedores.existsById(id)) return ResponseEntity.notFound().build();
        v.setId(id);
        return ResponseEntity.ok(fornecedores.save(v));
    }

    @GetMapping("/employees")
    public List<Employee> funcionarios() {
        return funcionarios.findAll();
    }

    @GetMapping("/job-functions")
    public List<String> jobFunctions() {
        return JobFunctionCatalog.all();
    }

    @PostMapping("/employees")
    public ResponseEntity<Employee> funcionario(@RequestBody Employee v) {
        if (funcionarios.findByCpf(v.getCpf()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(funcionarios.save(v));
    }

    @PutMapping("/employees/{id}")
    public ResponseEntity<Employee> funcionario(@PathVariable Long id, @RequestBody Employee v) {
        if (!funcionarios.existsById(id)) return ResponseEntity.notFound().build();
        v.setId(id);
        return ResponseEntity.ok(funcionarios.save(v));
    }
}
