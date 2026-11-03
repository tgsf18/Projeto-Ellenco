package com.ellenco.platform.domain;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

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

    public DashboardController(ReceiptRepository receiptRepository,
                               ProductRepository productRepository,
                               EpiDeliveryRepository epiDeliveryRepository,
                               StockBalanceRepository stockBalanceRepository,
                               MovementRepository movementRepository,
                               InventoryCountRepository inventoryCountRepository,
                               ToolAssetRepository toolAssetRepository,
                               ToolLoanRepository toolLoanRepository) {
        this.receiptRepository = receiptRepository;
        this.productRepository = productRepository;
        this.epiDeliveryRepository = epiDeliveryRepository;
        this.stockBalanceRepository = stockBalanceRepository;
        this.movementRepository = movementRepository;
        this.inventoryCountRepository = inventoryCountRepository;
        this.toolAssetRepository = toolAssetRepository;
        this.toolLoanRepository = toolLoanRepository;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public Map<String, Object> dashboard() {
        LocalDate today = LocalDate.now();
        LocalDate in30Days = today.plusDays(30);
        LocalDateTime since30Days = today.minusDays(29).atStartOfDay();

        // 1. Contagens diretas executadas no banco de dados (zero carregamento de entidades desnecessárias)
        long recebimentos = receiptRepository.countPendentes();
        long conferencias = receiptRepository.countByStatus("EM_CONFERENCIA");
        long baixoEstoque = productRepository.countBaixoEstoque();
        long assinaturas = epiDeliveryRepository.countPendentesAssinatura();
        long materiaisVencendo = stockBalanceRepository.countExpiringBefore(in30Days);
        long episVencendo = epiDeliveryRepository.countVencendoAte(in30Days);
        long distribuicoesEmAndamento = epiDeliveryRepository.countEntregues();
        long movimentacoes30Dias = movementRepository.countMovementsSince(since30Days);
        long inventarios = inventoryCountRepository.count();
        long ferramentas = toolAssetRepository.count();
        long emprestimosAtivos = toolLoanRepository.countByStatus("EMPRESTADO");

        // 2. Alertas prioritários
        List<Map<String, String>> alerts = new ArrayList<>();
        if (recebimentos > 0) alerts.add(alert(recebimentos + " recebimento(s) aguardando conferência", "/recebimentos"));
        if (assinaturas > 0) alerts.add(alert(assinaturas + " EPI(s) aguardando assinatura", "/epi"));
        if (baixoEstoque > 0) alerts.add(alert(baixoEstoque + " item(ns) abaixo do estoque mínimo", "/estoque"));
        if (materiaisVencendo > 0) alerts.add(alert(materiaisVencendo + " lote(s) vencido(s) ou próximos da validade", "/estoque"));
        if (episVencendo > 0) alerts.add(alert(episVencendo + " EPI(s) vencido(s) ou próximos da troca", "/epi"));

        Map<String, Long> summary = new LinkedHashMap<>();
        summary.put("recebimentosPendentes", recebimentos);
        summary.put("conferenciasPendentes", conferencias);
        summary.put("distribuicoesEmAndamento", distribuicoesEmAndamento);
        summary.put("episAguardandoEntrega", assinaturas);
        summary.put("estoquesBaixoMinimo", baixoEstoque);
        summary.put("assinaturasPendentes", assinaturas);
        summary.put("materiaisVencendo", materiaisVencendo);
        summary.put("episVencendo", episVencendo);
        summary.put("movimentacoes30Dias", movimentacoes30Dias);
        summary.put("inventarios", inventarios);
        summary.put("ferramentas", ferramentas);
        summary.put("emprestimosAtivos", emprestimosAtivos);

        // 3. Histórico dos últimos 30 dias consolidado via agregação no banco (GROUP BY)
        LocalDate startDate = today.minusDays(29);
        Map<LocalDate, Long> movementDays = new TreeMap<>();
        Map<LocalDate, Long> receiptDays = new TreeMap<>();
        for (int i = 0; i < 30; i++) {
            LocalDate day = startDate.plusDays(i);
            movementDays.put(day, 0L);
            receiptDays.put(day, 0L);
        }

        // Consultas agrupadas no banco
        List<DayCountProjection> dailyMovements = movementRepository.countDailyMovementsSince(since30Days);
        for (DayCountProjection p : dailyMovements) {
            if (p.getDay() != null && movementDays.containsKey(p.getDay())) {
                movementDays.put(p.getDay(), p.getCount());
            }
        }

        List<DayCountProjection> dailyReceipts = receiptRepository.countDailyReceiptsSince(since30Days);
        for (DayCountProjection p : dailyReceipts) {
            if (p.getDay() != null && receiptDays.containsKey(p.getDay())) {
                receiptDays.put(p.getDay(), p.getCount());
            }
        }

        List<Map<String, Object>> history = new ArrayList<>();
        movementDays.forEach((day, total) -> history.add(Map.of(
                "date", day.toString(),
                "movements", total,
                "receipts", receiptDays.getOrDefault(day, 0L)
        )));

        return Map.of("summary", summary, "alerts", alerts, "history", history);
    }

    private Map<String, String> alert(String title, String route) {
        return Map.of("title", title, "route", route);
    }
}
