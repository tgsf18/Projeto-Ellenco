package com.ellenco.platform.controllers;

import com.ellenco.platform.domain.Warehouse;
import com.ellenco.platform.domain.WarehouseRepository;
import com.ellenco.platform.domain.ConstructionSiteRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouses")
public class WarehouseController {

    private final WarehouseRepository warehouseRepository;
    private final ConstructionSiteRepository constructionSiteRepository;

    public WarehouseController(WarehouseRepository warehouseRepository, ConstructionSiteRepository constructionSiteRepository) {
        this.warehouseRepository = warehouseRepository;
        this.constructionSiteRepository = constructionSiteRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','FUNCIONARIO')")
    public List<Warehouse> list() {
        return warehouseRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<Warehouse> create(@RequestBody Warehouse warehouse) {
        if (warehouse.getNome() == null || warehouse.getNome().isBlank() || warehouse.getCodigo() == null || warehouse.getCodigo().isBlank()) throw new IllegalArgumentException("Nome e código do galpão são obrigatórios.");
        if (warehouse.getObra() == null || warehouse.getObra().getId() == null) throw new IllegalArgumentException("Selecione a obra do galpão.");
        warehouse.setObra(constructionSiteRepository.findById(warehouse.getObra().getId()).orElseThrow(() -> new IllegalArgumentException("Obra não encontrada.")));
        Warehouse saved = warehouseRepository.save(warehouse);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<Warehouse> update(@PathVariable Long id, @RequestBody Warehouse details) {
        return warehouseRepository.findById(id).map(w -> {
            w.setNome(details.getNome());
            w.setCodigo(details.getCodigo());
            w.setEndereco(details.getEndereco());
            w.setResponsavel(details.getResponsavel());
            w.setStatus(details.getStatus());
            w.setCapacidade(details.getCapacidade());
            return ResponseEntity.ok(warehouseRepository.save(w));
        }).orElse(ResponseEntity.notFound().build());
    }
}
