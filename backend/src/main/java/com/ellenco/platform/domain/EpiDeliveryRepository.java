package com.ellenco.platform.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDate;

@Repository
public interface EpiDeliveryRepository extends JpaRepository<EpiDelivery, Long> {
    List<EpiDelivery> findAllByOrderByDataEntregaDesc();
    List<EpiDelivery> findByFuncionarioIdOrderByDataEntregaDesc(Long funcionarioId);
    List<EpiDelivery> findByFuncionarioCpfOrderByDataEntregaDesc(String funcionarioCpf);
    List<EpiDelivery> findByStatusOrderByDataEntregaDesc(String status);

    @Query("SELECT COUNT(e) FROM EpiDelivery e WHERE e.status = 'PENDENTE_ASSINATURA'")
    long countPendentesAssinatura();

    @Query("SELECT COUNT(e) FROM EpiDelivery e WHERE e.status = 'ENTREGUE'")
    long countEntregues();

    @Query("SELECT e FROM EpiDelivery e WHERE e.dataPrevisaoTroca IS NOT NULL AND e.dataPrevisaoTroca <= :limite AND e.status <> 'SUBSTITUIDO' ORDER BY e.dataPrevisaoTroca")
    List<EpiDelivery> findVencendoAte(LocalDate limite);
}
