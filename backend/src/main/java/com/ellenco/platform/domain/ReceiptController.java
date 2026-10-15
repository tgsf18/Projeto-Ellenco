package com.ellenco.platform.domain;

import com.ellenco.platform.auth.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {
    private final ReceiptService service;
    public ReceiptController(ReceiptService service) { this.service = service; }
    @GetMapping @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public List<Receipt> list() { return service.listAll(); }
    @PostMapping @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public ResponseEntity<Receipt> create(@RequestBody Receipt receipt, @AuthenticationPrincipal User user) { return ResponseEntity.ok(service.createReceipt(receipt, user.getEmail(), user.getNome())); }
    @PostMapping("/{id}/conference") @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public Receipt conference(@PathVariable Long id, @AuthenticationPrincipal User user) { return service.startConference(id, user.getEmail(), user.getNome()); }
    @PatchMapping("/{receiptId}/items/{itemId}") @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public ReceiptItem item(@PathVariable Long receiptId, @PathVariable Long itemId, @RequestBody Map<String,Object> body, @AuthenticationPrincipal User user) { BigDecimal qty = body.get("quantidadeConferida") == null ? null : new BigDecimal(body.get("quantidadeConferida").toString()); return service.updateItemConference(receiptId, itemId, qty, (String) body.get("statusItem"), (String) body.get("motivoDivergencia"), user.getEmail(), user.getNome()); }
    @PostMapping("/{id}/finalize") @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')") public Receipt finalize(@PathVariable Long id, @RequestBody Map<String,String> body, @AuthenticationPrincipal User user) { return service.finalizeReceipt(id, body.get("status"), body.get("observacoes"), body.get("fotoComprovanteUrl"), user.getEmail(), user.getNome()); }
}
