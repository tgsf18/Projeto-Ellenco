package com.ellenco.platform.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MovementRepository extends JpaRepository<InventoryMovement, Long> {
    List<InventoryMovement> findTop50ByOrderByCreatedAtDesc();
    Page<InventoryMovement> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<InventoryMovement> findByProdutoIdOrderByCreatedAtDesc(Long produtoId);
    Page<InventoryMovement> findByProdutoIdOrderByCreatedAtDesc(Long produtoId, Pageable pageable);

    List<InventoryMovement> findByObraIdOrderByCreatedAtDesc(Long obraId);
    Page<InventoryMovement> findByObraIdOrderByCreatedAtDesc(Long obraId, Pageable pageable);

    List<InventoryMovement> findByTipoOrderByCreatedAtDesc(OperationType tipo);
    Page<InventoryMovement> findByTipoOrderByCreatedAtDesc(OperationType tipo, Pageable pageable);

    Optional<InventoryMovement> findByComprovanteCodigo(String codigo);

    @Query("SELECT COUNT(m) FROM InventoryMovement m WHERE m.createdAt >= :since")
    long countMovementsSince(@Param("since") LocalDateTime since);

    @Query("SELECT CAST(m.createdAt AS LocalDate) AS day, COUNT(m) AS count FROM InventoryMovement m WHERE m.createdAt >= :since GROUP BY CAST(m.createdAt AS LocalDate)")
    List<DayCountProjection> countDailyMovementsSince(@Param("since") LocalDateTime since);
}
