package com.ellenco.platform.domain;

import com.ellenco.platform.auth.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/receipts")
@PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
public class ReceiptController {

    private final ReceiptService service;

    public ReceiptController(ReceiptService service) {
        this.service = service;
    }

    @GetMapping
    public List<Receipt> list() {
        return service.listAll();
    }

    @GetMapping("/page")
    public Page<Receipt> page(Pageable pageable) {
        return service.listPaged(pageable);
    }

    @PostMapping
    public ResponseEntity<Receipt> create(@RequestBody Receipt receipt, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return ResponseEntity.ok(service.createReceipt(receipt, email, nome));
    }

    @PostMapping("/{id}/conference")
    public Receipt conference(@PathVariable Long id, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return service.startConference(id, email, nome);
    }

    @PatchMapping("/{receiptId}/items/{itemId}")
    public ReceiptItem item(@PathVariable Long receiptId,
                            @PathVariable Long itemId,
                            @RequestBody Map<String, Object> body,
                            @AuthenticationPrincipal User user) {
        BigDecimal qty = body.get("quantidadeConferida") == null ? null : new BigDecimal(body.get("quantidadeConferida").toString());
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return service.updateItemConference(receiptId, itemId, qty, (String) body.get("statusItem"), (String) body.get("motivoDivergencia"), email, nome);
    }

    @PostMapping("/{id}/finalize")
    public Receipt finalize(@PathVariable Long id, @RequestBody Map<String, String> body, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return service.finalizeReceipt(id, body.get("status"), body.get("observacoes"), body.get("fotoComprovanteUrl"), email, nome);
    }
}
