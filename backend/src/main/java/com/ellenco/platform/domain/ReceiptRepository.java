package com.ellenco.platform.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    List<Receipt> findAllByOrderByDataRecebimentoDesc();
    Page<Receipt> findAllByOrderByDataRecebimentoDesc(Pageable pageable);

    List<Receipt> findByStatusOrderByDataRecebimentoDesc(String status);
    long countByStatus(String status);

    @Query("SELECT COUNT(r) FROM Receipt r WHERE r.status IN ('AGUARDANDO_CONFERENCIA', 'EM_CONFERENCIA')")
    long countPendentes();

    @Query("SELECT CAST(r.createdAt AS LocalDate) AS day, COUNT(r) AS count FROM Receipt r WHERE r.createdAt >= :since GROUP BY CAST(r.createdAt AS LocalDate)")
    List<DayCountProjection> countDailyReceiptsSince(@Param("since") LocalDateTime since);
}
