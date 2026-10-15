package com.ellenco.platform.domain;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final ReceiptRepository receiptRepository;
    private final ProductRepository productRepository;
    private final EpiDeliveryRepository epiDeliveryRepository;
    private final StockBalanceRepository stockBalanceRepository;
    private final MovementRepository movementRepository;
    private final InventoryCountRepository inventoryCountRepository;
    private final ToolAssetRepository toolAssetRepository;
    private final ToolLoanRepository toolLoanRepository;

    public DashboardController(ReceiptRepository receiptRepository, ProductRepository productRepository, EpiDeliveryRepository epiDeliveryRepository, StockBalanceRepository stockBalanceRepository, MovementRepository movementRepository, InventoryCountRepository inventoryCountRepository, ToolAssetRepository toolAssetRepository, ToolLoanRepository toolLoanRepository) {
        this.receiptRepository = receiptRepository;
        this.productRepository = productRepository;
        this.epiDeliveryRepository = epiDeliveryRepository;
        this.stockBalanceRepository = stockBalanceRepository;
        this.movementRepository=movementRepository;this.inventoryCountRepository=inventoryCountRepository;this.toolAssetRepository=toolAssetRepository;this.toolLoanRepository=toolLoanRepository;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','FUNCIONARIO')")
    public Map<String, Object> dashboard() {
        long recebimentos = receiptRepository.countPendentes();
        long conferencias = receiptRepository.findByStatusOrderByDataRecebimentoDesc("EM_CONFERENCIA").size();
        long baixoEstoque = productRepository.countBaixoEstoque();
        long assinaturas = epiDeliveryRepository.countPendentesAssinatura();
        long materiaisVencendo = stockBalanceRepository.expiringBefore(java.time.LocalDate.now().plusDays(30)).size();
        long episVencendo = epiDeliveryRepository.findVencendoAte(java.time.LocalDate.now().plusDays(30)).size();
        List<Map<String, String>> alerts = new ArrayList<>();
        if (recebimentos > 0) alerts.add(alert(recebimentos + " recebimento(s) aguardando conferência", "/recebimentos"));
        if (assinaturas > 0) alerts.add(alert(assinaturas + " EPI(s) aguardando assinatura", "/epi"));
        if (baixoEstoque > 0) alerts.add(alert(baixoEstoque + " item(ns) abaixo do estoque mínimo", "/estoque"));
        if (materiaisVencendo > 0) alerts.add(alert(materiaisVencendo + " lote(s) vencido(s) ou próximos da validade", "/estoque"));
        if (episVencendo > 0) alerts.add(alert(episVencendo + " EPI(s) vencido(s) ou próximos da troca", "/epi"));
        Map<String, Long> summary = new LinkedHashMap<>();
        summary.put("recebimentosPendentes", recebimentos);
        summary.put("conferenciasPendentes", conferencias);
        summary.put("distribuicoesEmAndamento", epiDeliveryRepository.countEntregues());
        summary.put("episAguardandoEntrega", assinaturas);
        summary.put("estoquesBaixoMinimo", baixoEstoque);
        summary.put("assinaturasPendentes", assinaturas);
        summary.put("materiaisVencendo", materiaisVencendo);
        summary.put("episVencendo", episVencendo);
        summary.put("movimentacoes30Dias", movementRepository.countMovementsSince(java.time.LocalDateTime.now().minusDays(30)));
        summary.put("inventarios", inventoryCountRepository.count());
        summary.put("ferramentas", toolAssetRepository.count());
        summary.put("emprestimosAtivos", toolLoanRepository.findAllByOrderByEmprestadoEmDesc().stream().filter(x -> "EMPRESTADO".equals(x.getStatus())).count());
        java.time.LocalDate start=java.time.LocalDate.now().minusDays(29);Map<java.time.LocalDate,Long> movementDays=new java.util.TreeMap<>(),receiptDays=new java.util.TreeMap<>();for(int i=0;i<30;i++){movementDays.put(start.plusDays(i),0L);receiptDays.put(start.plusDays(i),0L);}movementRepository.findAll().stream().filter(m->m.getCreatedAt()!=null&&!m.getCreatedAt().toLocalDate().isBefore(start)).forEach(m->movementDays.computeIfPresent(m.getCreatedAt().toLocalDate(),(k,v)->v+1));receiptRepository.findAll().stream().filter(r->r.getCreatedAt()!=null&&!r.getCreatedAt().toLocalDate().isBefore(start)).forEach(r->receiptDays.computeIfPresent(r.getCreatedAt().toLocalDate(),(k,v)->v+1));List<Map<String,Object>> history=new ArrayList<>();movementDays.forEach((day,total)->history.add(Map.of("date",day.toString(),"movements",total,"receipts",receiptDays.getOrDefault(day,0L))));
        return Map.of("summary", summary, "alerts", alerts,"history",history);
    }

    private Map<String, String> alert(String title, String route) { return Map.of("title", title, "route", route); }
}
