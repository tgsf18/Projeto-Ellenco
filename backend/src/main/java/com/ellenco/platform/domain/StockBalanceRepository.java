package com.ellenco.platform.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockBalanceRepository extends JpaRepository<StockBalance, Long> {
    List<StockBalance> findByProdutoIdOrderByDataValidadeAsc(Long id);
    List<StockBalance> findByGalpaoIdOrderByProdutoNomeAsc(Long warehouseId);
    List<StockBalance> findByGalpaoObraIdOrderByProdutoNomeAsc(Long siteId);
    List<StockBalance> findByStatusOrderByProdutoNomeAsc(String status);
    Page<StockBalance> findAll(Pageable pageable);

    Optional<StockBalance> findByProdutoIdAndGalpaoIdAndLoteAndLocalizacaoPrateleira(Long productId, Long warehouseId, String lot, String location);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockBalance s WHERE s.id = :id")
    Optional<StockBalance> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockBalance s WHERE s.produto.id = :productId AND s.galpao.id = :warehouseId AND s.lote = :lot AND s.localizacaoPrateleira = :location")
    Optional<StockBalance> findForUpdate(@Param("productId") Long productId, @Param("warehouseId") Long warehouseId, @Param("lot") String lot, @Param("location") String location);

    @Query("SELECT s FROM StockBalance s WHERE s.dataValidade IS NOT NULL AND s.dataValidade <= :date AND s.quantidadeAtual > 0")
    List<StockBalance> expiringBefore(@Param("date") LocalDate date);

    @Query("SELECT COUNT(s) FROM StockBalance s WHERE s.dataValidade IS NOT NULL AND s.dataValidade <= :date AND s.quantidadeAtual > 0")
    long countExpiringBefore(@Param("date") LocalDate date);

    @Query("SELECT s FROM StockBalance s WHERE s.quantidadeAtual - s.quantidadeReservada - s.quantidadeBloqueada <= s.quantidadeMinima")
    List<StockBalance> lowStock();

    @Query("SELECT COUNT(s) FROM StockBalance s WHERE s.quantidadeAtual - s.quantidadeReservada - s.quantidadeBloqueada <= s.quantidadeMinima")
    long countLowStock();

    @Query("SELECT COALESCE(SUM(s.quantidadeAtual), 0) FROM StockBalance s WHERE s.produto.id = :prodId")
    BigDecimal sumQuantidadeByProdutoId(@Param("prodId") Long prodId);

    @Query("SELECT COUNT(s), COALESCE(SUM(s.quantidadeAtual), 0), COALESCE(SUM(s.quantidadeAtual - s.quantidadeReservada - s.quantidadeBloqueada), 0) FROM StockBalance s")
    List<Object[]> getAggregatedSummary();
}
