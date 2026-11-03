package com.ellenco.platform.controllers;

import com.ellenco.platform.domain.StockBalance;
import com.ellenco.platform.domain.StockBalanceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stock/balances")
@PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
public class StockBalanceController {

    private final StockBalanceRepository balances;

    public StockBalanceController(StockBalanceRepository balances) {
        this.balances = balances;
    }

    @GetMapping
    public List<StockBalance> list(@RequestParam(required = false) Long obraId,
                                  @RequestParam(required = false) Long galpaoId,
                                  @RequestParam(required = false) Long produtoId,
                                  @RequestParam(required = false) String status) {
        if (produtoId != null) return balances.findByProdutoIdOrderByDataValidadeAsc(produtoId);
        if (galpaoId != null) return balances.findByGalpaoIdOrderByProdutoNomeAsc(galpaoId);
        if (obraId != null) return balances.findByGalpaoObraIdOrderByProdutoNomeAsc(obraId);
        if (status != null && !status.isBlank()) return balances.findByStatusOrderByProdutoNomeAsc(status);
        return balances.findAll();
    }

    @GetMapping("/page")
    public Page<StockBalance> page(Pageable pageable) {
        return balances.findAll(pageable);
    }

    @GetMapping("/product/{productId}")
    public List<StockBalance> byProduct(@PathVariable Long productId) {
        return balances.findByProdutoIdOrderByDataValidadeAsc(productId);
    }

    @GetMapping("/low-stock")
    public List<StockBalance> lowStock() {
        return balances.lowStock();
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<Object[]> agg = balances.getAggregatedSummary();
        long totalEnderecos = 0L;
        BigDecimal totalQtd = BigDecimal.ZERO;
        BigDecimal totalDisponivel = BigDecimal.ZERO;

        if (agg != null && !agg.isEmpty()) {
            Object[] row = agg.get(0);
            totalEnderecos = row[0] != null ? ((Number) row[0]).longValue() : 0L;
            totalQtd = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            totalDisponivel = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
        }

        long criticos = balances.countLowStock();

        return Map.of(
                "enderecos", totalEnderecos,
                "quantidadeTotal", totalQtd,
                "quantidadeDisponivel", totalDisponivel,
                "estoquesCriticos", criticos
        );
    }

    @GetMapping("/alerts")
    public Map<String, List<StockBalance>> alerts() {
        LocalDate now = LocalDate.now();
        List<StockBalance> exp = balances.expiringBefore(now.plusDays(30));
        return Map.of(
                "vencidos", exp.stream().filter(x -> x.getDataValidade() != null && x.getDataValidade().isBefore(now)).toList(),
                "proximosVencimento", exp.stream().filter(x -> x.getDataValidade() != null && !x.getDataValidade().isBefore(now)).toList(),
                "estoqueBaixo", balances.lowStock()
        );
    }
}
