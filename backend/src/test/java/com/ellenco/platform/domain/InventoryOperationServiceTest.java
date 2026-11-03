package com.ellenco.platform.domain;

import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryOperationServiceTest {

    @Mock
    private StockBalanceRepository balances;

    @Mock
    private ProductRepository products;

    @Mock
    private WarehouseRepository warehouses;

    @Mock
    private MovementRepository movements;

    @Mock
    private AuditService audit;

    private InventoryOperationService service;
    private User testUser;
    private Product testProduct;
    private Warehouse testWarehouse;
    private StockBalance testBalance;

    @BeforeEach
    void setUp() {
        service = new InventoryOperationService(balances, products, warehouses, movements, audit);
        testUser = new User("Operador", "operador@ellenco.com", "pass", Role.SUPERVISOR);

        testWarehouse = new Warehouse();
        testWarehouse.setId(1L);
        testWarehouse.setNome("Almoxarifado Central");

        testProduct = new Product();
        testProduct.setId(10L);
        testProduct.setCodigo("PRD-01");
        testProduct.setNome("Cimento CP II");
        testProduct.setUnidade("SC");
        testProduct.setQuantidadeAtual(new BigDecimal("100.00"));
        testProduct.setQuantidadeMinima(new BigDecimal("10.00"));

        testBalance = new StockBalance();
        testBalance.setId(100L);
        testBalance.setProduto(testProduct);
        testBalance.setGalpao(testWarehouse);
        testBalance.setLote("LOTE-2026-A");
        testBalance.setLocalizacaoPrateleira("A-01");
        testBalance.setDataValidade(LocalDate.now().plusMonths(6));
        testBalance.setQuantidadeAtual(new BigDecimal("100.00"));
        testBalance.setQuantidadeReservada(BigDecimal.ZERO);
        testBalance.setQuantidadeBloqueada(BigDecimal.ZERO);
        testBalance.setStatus("DISPONIVEL");
    }

    @Test
    void saidaComSaldoSuficienteDeveDebitarEAtualizarProduto() {
        when(balances.findByIdForUpdate(100L)).thenReturn(Optional.of(testBalance));
        when(balances.save(any(StockBalance.class))).thenAnswer(i -> i.getArgument(0));
        when(balances.sumQuantidadeByProdutoId(10L)).thenReturn(new BigDecimal("80.00"));
        when(products.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));
        when(movements.save(any(InventoryMovement.class))).thenAnswer(i -> {
            InventoryMovement m = i.getArgument(0);
            m.setId(500L);
            return m;
        });

        InventoryOperationRequest request = new InventoryOperationRequest(
                OperationType.SAIDA,
                10L,
                100L,
                1L,
                null,
                "LOTE-2026-A",
                "A-01",
                null,
                null,
                new BigDecimal("20.00"),
                null,
                "Etapa 1",
                "Frente Norte",
                "Equipe Alpha",
                "Carlos",
                "Aplicação em laje",
                null
        );

        InventoryMovement result = service.execute(request, testUser);

        assertNotNull(result);
        assertEquals(new BigDecimal("80.00"), testBalance.getQuantidadeAtual());
        assertEquals(new BigDecimal("80.00"), testProduct.getQuantidadeAtual());
        verify(balances).save(testBalance);
        verify(products).save(testProduct);
        verify(movements).save(any(InventoryMovement.class));
    }

    @Test
    void saidaComSaldoInsuficienteDeveLancarExcecao() {
        when(balances.findByIdForUpdate(100L)).thenReturn(Optional.of(testBalance));

        InventoryOperationRequest request = new InventoryOperationRequest(
                OperationType.SAIDA,
                10L,
                100L,
                1L,
                null,
                "LOTE-2026-A",
                "A-01",
                null,
                null,
                new BigDecimal("150.00"), // Maior que 100
                null,
                null, null, null, null,
                "Tentativa acima do estoque",
                null
        );

        assertThrows(IllegalArgumentException.class, () -> service.execute(request, testUser));
        verify(movements, never()).save(any());
    }

    @Test
    void saidaComLoteVencidoDeveSerBloqueada() {
        testBalance.setDataValidade(LocalDate.now().minusDays(1)); // Vencido
        when(balances.findByIdForUpdate(100L)).thenReturn(Optional.of(testBalance));

        InventoryOperationRequest request = new InventoryOperationRequest(
                OperationType.SAIDA,
                10L,
                100L,
                1L,
                null,
                "LOTE-2026-A",
                "A-01",
                null,
                null,
                new BigDecimal("10.00"),
                null,
                null, null, null, null,
                "Uso de material",
                null
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.execute(request, testUser));
        assertTrue(ex.getMessage().contains("vencida"));
        verify(movements, never()).save(any());
    }

    @Test
    void reservaDeveIncrementarSaldoReservadoSemAlterarSaldoFisico() {
        when(balances.findByIdForUpdate(100L)).thenReturn(Optional.of(testBalance));
        when(balances.save(any(StockBalance.class))).thenAnswer(i -> i.getArgument(0));
        when(balances.sumQuantidadeByProdutoId(10L)).thenReturn(new BigDecimal("100.00"));
        when(products.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));
        when(movements.save(any(InventoryMovement.class))).thenAnswer(i -> {
            InventoryMovement m = i.getArgument(0);
            m.setId(501L);
            return m;
        });

        InventoryOperationRequest request = new InventoryOperationRequest(
                OperationType.RESERVA,
                10L,
                100L,
                1L,
                null,
                "LOTE-2026-A",
                "A-01",
                null,
                null,
                new BigDecimal("30.00"),
                null, null, null, null, null,
                "Reserva para montagem",
                null
        );

        service.execute(request, testUser);

        assertEquals(new BigDecimal("100.00"), testBalance.getQuantidadeAtual());
        assertEquals(new BigDecimal("30.00"), testBalance.getQuantidadeReservada());
        assertEquals(new BigDecimal("70.00"), testBalance.getQuantidadeDisponivel());
    }
}
