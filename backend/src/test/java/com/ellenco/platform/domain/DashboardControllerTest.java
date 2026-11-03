package com.ellenco.platform.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock private ReceiptRepository receiptRepository;
    @Mock private ProductRepository productRepository;
    @Mock private EpiDeliveryRepository epiDeliveryRepository;
    @Mock private StockBalanceRepository stockBalanceRepository;
    @Mock private MovementRepository movementRepository;
    @Mock private InventoryCountRepository inventoryCountRepository;
    @Mock private ToolAssetRepository toolAssetRepository;
    @Mock private ToolLoanRepository toolLoanRepository;

    private DashboardController controller;

    @BeforeEach
    void setUp() {
        controller = new DashboardController(
                receiptRepository,
                productRepository,
                epiDeliveryRepository,
                stockBalanceRepository,
                movementRepository,
                inventoryCountRepository,
                toolAssetRepository,
                toolLoanRepository
        );
    }

    @Test
    void dashboardDeveConsultarContagensDiretasSemCarregarEntidadesCompletas() {
        when(receiptRepository.countPendentes()).thenReturn(3L);
        when(receiptRepository.countByStatus("EM_CONFERENCIA")).thenReturn(1L);
        when(productRepository.countBaixoEstoque()).thenReturn(5L);
        when(epiDeliveryRepository.countPendentesAssinatura()).thenReturn(2L);
        when(stockBalanceRepository.countExpiringBefore(any(LocalDate.class))).thenReturn(4L);
        when(epiDeliveryRepository.countVencendoAte(any(LocalDate.class))).thenReturn(2L);
        when(epiDeliveryRepository.countEntregues()).thenReturn(10L);
        when(movementRepository.countMovementsSince(any(LocalDateTime.class))).thenReturn(25L);
        when(inventoryCountRepository.count()).thenReturn(8L);
        when(toolAssetRepository.count()).thenReturn(15L);
        when(toolLoanRepository.countByStatus("EMPRESTADO")).thenReturn(6L);

        DayCountProjection p1 = new DayCountProjection() {
            @Override public LocalDate getDay() { return LocalDate.now().minusDays(1); }
            @Override public Long getCount() { return 12L; }
        };
        when(movementRepository.countDailyMovementsSince(any(LocalDateTime.class))).thenReturn(List.of(p1));
        when(receiptRepository.countDailyReceiptsSince(any(LocalDateTime.class))).thenReturn(List.of());

        Map<String, Object> result = controller.dashboard();

        assertNotNull(result);
        assertTrue(result.containsKey("summary"));
        assertTrue(result.containsKey("alerts"));
        assertTrue(result.containsKey("history"));

        @SuppressWarnings("unchecked")
        Map<String, Long> summary = (Map<String, Long>) result.get("summary");
        assertEquals(3L, summary.get("recebimentosPendentes"));
        assertEquals(1L, summary.get("conferenciasPendentes"));
        assertEquals(5L, summary.get("estoquesBaixoMinimo"));
        assertEquals(6L, summary.get("emprestimosAtivos"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) result.get("history");
        assertEquals(30, history.size()); // Exatamente 30 dias

        // Garantir que métodos pesados de findAll() NUNCA foram chamados
        verify(movementRepository, never()).findAll();
        verify(receiptRepository, never()).findAll();
    }
}
