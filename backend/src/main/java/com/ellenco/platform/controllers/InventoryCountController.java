package com.ellenco.platform.controllers;

import com.ellenco.platform.auth.User;
import com.ellenco.platform.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/inventory/counts")
@PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
public class InventoryCountController {

    private final InventoryCountRepository counts;
    private final InventoryCountItemRepository items;
    private final WarehouseRepository warehouses;
    private final StockBalanceRepository balances;
    private final ProductRepository products;
    private final MovementRepository movements;
    private final AuditService audit;

    public InventoryCountController(InventoryCountRepository c,
                                    InventoryCountItemRepository i,
                                    WarehouseRepository w,
                                    StockBalanceRepository b,
                                    ProductRepository p,
                                    MovementRepository m,
                                    AuditService a) {
        this.counts = c;
        this.items = i;
        this.warehouses = w;
        this.balances = b;
        this.products = p;
        this.movements = m;
        this.audit = a;
    }

    @GetMapping
    public List<InventoryCount> list() {
        return counts.findAllByOrderByIniciadoEmDesc();
    }

    @PostMapping
    @Transactional
    public InventoryCount start(@RequestBody Map<String, Object> body, @AuthenticationPrincipal User user) {
        Long wid = Long.valueOf(body.get("galpaoId").toString());
        Warehouse w = warehouses.findById(wid)
                .orElseThrow(() -> new IllegalArgumentException("Almoxarifado não encontrado."));

        InventoryCount c = new InventoryCount();
        c.setGalpao(w);
        c.setResponsavel(user != null ? user.getNome() : "Sistema");
        c.setIniciadoPorId(user != null ? user.getId() : null);
        c.setContagemCega(!Boolean.FALSE.equals(body.get("contagemCega")));
        c = counts.save(c);

        for (StockBalance b : balances.findByGalpaoIdOrderByProdutoNomeAsc(wid)) {
            InventoryCountItem i = new InventoryCountItem();
            i.setInventario(c);
            i.setSaldo(b);
            i.setSaldoSistema(b.getQuantidadeAtual());
            items.save(i);
            c.getItens().add(i);
        }

        audit.log(user != null ? user.getNome() : "Sistema", user != null ? user.getEmail() : "sistema",
                "INVENTARIO", "INICIO", "InventoryCount", c.getId().toString(), "Inventário iniciado em " + w.getNome());
        return counts.save(c);
    }

    @PatchMapping("/{countId}/items/{itemId}")
    @Transactional
    public InventoryCountItem count(@PathVariable Long countId, @PathVariable Long itemId, @RequestBody Map<String, Object> body) {
        InventoryCount c = counts.findById(countId)
                .orElseThrow(() -> new IllegalArgumentException("Inventário não encontrado."));
        if (!"EM_CONTAGEM".equals(c.getStatus())) {
            throw new IllegalArgumentException("Inventário não está aberto para contagem.");
        }

        InventoryCountItem i = items.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item não encontrado."));

        BigDecimal q = new BigDecimal(body.get("quantidadeContada").toString());
        if (q.signum() < 0) {
            throw new IllegalArgumentException("A quantidade contada não pode ser negativa.");
        }

        i.setQuantidadeContada(q);
        i.setDivergencia(q.subtract(i.getSaldoSistema()));
        i.setMotivo((String) body.get("motivo"));
        i.setContado(true);
        return items.save(i);
    }

    @PostMapping("/{id}/submit")
    @Transactional
    public InventoryCount submit(@PathVariable Long id) {
        InventoryCount c = counts.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Inventário não encontrado."));
        if (c.getItens().stream().anyMatch(i -> !i.isContado())) {
            throw new IllegalArgumentException("Todos os itens do inventário precisam ser contados antes do envio.");
        }
        c.setStatus("AGUARDANDO_APROVACAO");
        c.setEnviadoEm(LocalDateTime.now());
        return counts.save(c);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN')")
    @Transactional
    public InventoryCount approve(@PathVariable Long id, @AuthenticationPrincipal User user) {
        InventoryCount c = counts.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Inventário não encontrado."));
        if (!"AGUARDANDO_APROVACAO".equals(c.getStatus())) {
            throw new IllegalArgumentException("Este inventário não está aguardando aprovação.");
        }
        if (user != null && user.getId().equals(c.getIniciadoPorId())) {
            throw new IllegalArgumentException("Quem iniciou o inventário não pode aprovar os próprios ajustes.");
        }

        Set<Product> affectedProducts = new HashSet<>();

        for (InventoryCountItem i : c.getItens()) {
            if (i.getDivergencia() != null && i.getDivergencia().signum() != 0) {
                if (i.getMotivo() == null || i.getMotivo().isBlank()) {
                    throw new IllegalArgumentException("Itens com divergência de saldo exigem justificativa obrigatória.");
                }

                StockBalance balance = i.getSaldo();
                BigDecimal anterior = balance.getQuantidadeAtual();
                BigDecimal novoSaldo = i.getQuantidadeContada();

                balance.setQuantidadeAtual(novoSaldo);
                balances.save(balance);

                Product prod = balance.getProduto();
                affectedProducts.add(prod);

                // Registra movimentação de AJUSTE no Kardex
                InventoryMovement mov = new InventoryMovement(
                        prod,
                        OperationType.AJUSTE,
                        novoSaldo,
                        balance.getGalpao().getNome(),
                        balance.getGalpao().getNome(),
                        user != null ? user.getNome() : "Admin",
                        "Ajuste de Inventário #" + c.getId() + " - " + i.getMotivo(),
                        "Saldo anterior: " + anterior + " -> Ajustado para: " + novoSaldo
                );
                mov.setSaldoOrigemId(balance.getId());
                mov.setLote(balance.getLote());
                mov.setLocalizacao(balance.getLocalizacaoPrateleira());
                mov.setComprovanteCodigo("INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                mov.setCreatedAt(LocalDateTime.now());
                movements.save(mov);
            }
        }

        // Recalcula o saldo total de cada produto afetado a partir das somas no banco
        for (Product prod : affectedProducts) {
            BigDecimal totalSaldos = balances.sumQuantidadeByProdutoId(prod.getId());
            prod.setQuantidadeAtual(totalSaldos);
            prod.setUpdatedAt(LocalDateTime.now());
            products.save(prod);
        }

        c.setStatus("APROVADO");
        c.setAprovadoEm(LocalDateTime.now());
        c.setAprovadoPor(user != null ? user.getNome() : "Admin");
        c.setAprovadoPorId(user != null ? user.getId() : null);

        audit.log(user != null ? user.getNome() : "Admin", user != null ? user.getEmail() : "admin@ellenco.com",
                "INVENTARIO", "APROVACAO", "InventoryCount", id.toString(), "Ajustes de inventário aprovados e saldos sincronizados.");

        return counts.save(c);
    }
}
