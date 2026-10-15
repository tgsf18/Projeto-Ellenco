package com.ellenco.platform.domain;

import com.ellenco.platform.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<Product> listProducts() {
        return stockService.listProducts();
    }

    @GetMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public Product getProduct(@PathVariable Long id) {
        return stockService.getProduct(id);
    }

    @PostMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<Product> createProduct(@Valid @RequestBody Product product, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return ResponseEntity.ok(stockService.createProduct(product, email, nome));
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @RequestBody Product details, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return ResponseEntity.ok(stockService.updateProduct(id, details, email, nome));
    }

    @DeleteMapping("/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        stockService.deleteProduct(id, email, nome);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<Category> listCategories() {
        return stockService.listCategories();
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<Category> createCategory(@RequestBody Category category, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return ResponseEntity.ok(stockService.createCategory(category, email, nome));
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<InventoryMovement> listMovements() {
        return stockService.listMovements();
    }

    @PostMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<InventoryMovement> createMovement(@RequestBody InventoryMovement movement, @AuthenticationPrincipal User user) {
        String email = user != null ? user.getEmail() : "sistema";
        String nome = user != null ? user.getNome() : "Sistema";
        return ResponseEntity.ok(stockService.registerMovement(movement, email, nome));
    }

    @GetMapping("/alerts/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<Product> listLowStock() {
        return stockService.listBaixoEstoque();
    }
}
