package com.ellenco.platform.domain;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<AuditLog> listAll(@RequestParam(required = false) String modulo) {
        if (modulo != null && !modulo.isBlank()) {
            return auditService.listByModulo(modulo);
        }
        return auditService.listAll();
    }
}
