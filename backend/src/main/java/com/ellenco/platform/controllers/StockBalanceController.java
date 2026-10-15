package com.ellenco.platform.controllers;

import com.ellenco.platform.domain.StockBalance;
import com.ellenco.platform.domain.StockBalanceRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stock/balances")
@PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
public class StockBalanceController {
    private final StockBalanceRepository balances;
    public StockBalanceController(StockBalanceRepository balances){this.balances=balances;}
    @GetMapping public List<StockBalance> list(@RequestParam(required=false) Long obraId,@RequestParam(required=false) Long galpaoId,@RequestParam(required=false) Long produtoId,@RequestParam(required=false) String status){if(produtoId!=null)return balances.findByProdutoIdOrderByDataValidadeAsc(produtoId);if(galpaoId!=null)return balances.findByGalpaoIdOrderByProdutoNomeAsc(galpaoId);if(obraId!=null)return balances.findByGalpaoObraIdOrderByProdutoNomeAsc(obraId);if(status!=null&&!status.isBlank())return balances.findByStatusOrderByProdutoNomeAsc(status);return balances.findAll();}
    @GetMapping("/product/{productId}") public List<StockBalance> byProduct(@PathVariable Long productId){return balances.findByProdutoIdOrderByDataValidadeAsc(productId);}
    @GetMapping("/low-stock") public List<StockBalance> lowStock(){return balances.lowStock();}
    @GetMapping("/summary") public Map<String,Object> summary(){List<StockBalance> all=balances.findAll();BigDecimal total=all.stream().map(StockBalance::getQuantidadeAtual).reduce(BigDecimal.ZERO,BigDecimal::add);BigDecimal available=all.stream().map(StockBalance::getQuantidadeDisponivel).reduce(BigDecimal.ZERO,BigDecimal::add);return Map.of("enderecos",all.size(),"quantidadeTotal",total,"quantidadeDisponivel",available,"estoquesCriticos",balances.lowStock().size());}
    @GetMapping("/alerts") public Map<String,List<StockBalance>> alerts(){LocalDate now=LocalDate.now();List<StockBalance> exp=balances.expiringBefore(now.plusDays(30));return Map.of("vencidos",exp.stream().filter(x->x.getDataValidade().isBefore(now)).toList(),"proximosVencimento",exp.stream().filter(x->!x.getDataValidade().isBefore(now)).toList(),"estoqueBaixo",balances.lowStock());}
}
