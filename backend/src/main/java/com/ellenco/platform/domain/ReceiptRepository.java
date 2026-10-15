package com.ellenco.platform.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    List<Receipt> findAllByOrderByDataRecebimentoDesc();
    List<Receipt> findByStatusOrderByDataRecebimentoDesc(String status);

    @Query("SELECT COUNT(r) FROM Receipt r WHERE r.status IN ('AGUARDANDO_CONFERENCIA', 'EM_CONFERENCIA')")
    long countPendentes();
}
