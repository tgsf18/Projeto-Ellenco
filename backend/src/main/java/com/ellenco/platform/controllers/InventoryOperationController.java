package com.ellenco.platform.controllers;

import com.ellenco.platform.auth.User;
import com.ellenco.platform.domain.*;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory/operations")
public class InventoryOperationController {
    private final InventoryOperationService service; private final MovementRepository movements;
    public InventoryOperationController(InventoryOperationService service,MovementRepository movements){this.service=service;this.movements=movements;}
    @PostMapping @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public InventoryMovement execute(@Valid @RequestBody InventoryOperationRequest request,@AuthenticationPrincipal User user){return service.execute(request,user);}
    @PostMapping("/{id}/reverse") @PreAuthorize("hasRole('ADMIN')") public InventoryMovement reverse(@PathVariable Long id,@RequestBody Map<String,String> body,@AuthenticationPrincipal User user){return service.reverse(id,body.get("motivo"),user);}
    @GetMapping @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public List<InventoryMovement> kardex(@RequestParam(required=false) Long produtoId,@RequestParam(required=false) Long obraId,@RequestParam(required=false) OperationType tipo){if(produtoId!=null)return movements.findByProdutoIdOrderByCreatedAtDesc(produtoId);if(obraId!=null)return movements.findByObraIdOrderByCreatedAtDesc(obraId);if(tipo!=null)return movements.findByTipoOrderByCreatedAtDesc(tipo);return movements.findTop50ByOrderByCreatedAtDesc();}
    @GetMapping("/receipt/{code}") @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public InventoryMovement receipt(@PathVariable String code){return movements.findByComprovanteCodigo(code).orElseThrow(()->new IllegalArgumentException("Comprovante não encontrado."));}
}
