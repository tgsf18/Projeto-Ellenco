package com.ellenco.platform.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EpiDeliveryRepository extends JpaRepository<EpiDelivery, Long> {
    List<EpiDelivery> findAllByOrderByDataEntregaDesc();
    Page<EpiDelivery> findAllByOrderByDataEntregaDesc(Pageable pageable);

    List<EpiDelivery> findByFuncionarioIdOrderByDataEntregaDesc(Long funcionarioId);
    List<EpiDelivery> findByFuncionarioCpfOrderByDataEntregaDesc(String funcionarioCpf);
    Page<EpiDelivery> findByFuncionarioCpfOrderByDataEntregaDesc(String funcionarioCpf, Pageable pageable);

    List<EpiDelivery> findByStatusOrderByDataEntregaDesc(String status);

    @Query("SELECT COUNT(e) FROM EpiDelivery e WHERE e.status = 'PENDENTE_ASSINATURA'")
    long countPendentesAssinatura();

    @Query("SELECT COUNT(e) FROM EpiDelivery e WHERE e.status = 'ENTREGUE'")
    long countEntregues();

    @Query("SELECT e FROM EpiDelivery e WHERE e.dataPrevisaoTroca IS NOT NULL AND e.dataPrevisaoTroca <= :limite AND e.status <> 'SUBSTITUIDO' ORDER BY e.dataPrevisaoTroca")
    List<EpiDelivery> findVencendoAte(@Param("limite") LocalDate limite);

    @Query("SELECT COUNT(e) FROM EpiDelivery e WHERE e.dataPrevisaoTroca IS NOT NULL AND e.dataPrevisaoTroca <= :limite AND e.status <> 'SUBSTITUIDO'")
    long countVencendoAte(@Param("limite") LocalDate limite);
}
