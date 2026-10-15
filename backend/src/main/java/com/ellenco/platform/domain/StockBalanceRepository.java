package com.ellenco.platform.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StockBalanceRepository extends JpaRepository<StockBalance,Long> {
    List<StockBalance> findByProdutoIdOrderByDataValidadeAsc(Long id);
    List<StockBalance> findByGalpaoIdOrderByProdutoNomeAsc(Long warehouseId);
    List<StockBalance> findByGalpaoObraIdOrderByProdutoNomeAsc(Long siteId);
    List<StockBalance> findByStatusOrderByProdutoNomeAsc(String status);
    Optional<StockBalance> findByProdutoIdAndGalpaoIdAndLoteAndLocalizacaoPrateleira(Long productId, Long warehouseId, String lot, String location);
    @Query("select s from StockBalance s where s.dataValidade is not null and s.dataValidade <= :date and s.quantidadeAtual > 0")
    List<StockBalance> expiringBefore(@Param("date") LocalDate date);
    @Query("select s from StockBalance s where s.quantidadeAtual - s.quantidadeReservada - s.quantidadeBloqueada <= s.quantidadeMinima")
    List<StockBalance> lowStock();
}
