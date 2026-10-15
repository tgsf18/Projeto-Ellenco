package com.ellenco.platform.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MovementRepository extends JpaRepository<InventoryMovement, Long> {
    List<InventoryMovement> findTop50ByOrderByCreatedAtDesc();
    List<InventoryMovement> findByProdutoIdOrderByCreatedAtDesc(Long produtoId);
    List<InventoryMovement> findByObraIdOrderByCreatedAtDesc(Long obraId);
    List<InventoryMovement> findByTipoOrderByCreatedAtDesc(OperationType tipo);
    Optional<InventoryMovement> findByComprovanteCodigo(String codigo);

    @Query("SELECT COUNT(m) FROM InventoryMovement m WHERE m.createdAt >= :since")
    long countMovementsSince(LocalDateTime since);
}
