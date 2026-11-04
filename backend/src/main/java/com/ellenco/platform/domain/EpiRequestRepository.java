package com.ellenco.platform.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface EpiRequestRepository extends JpaRepository<EpiRequest, Long> {
    long countByStatus(String status);
    List<EpiRequest> findAllByOrderBySolicitadaEmDesc();
    List<EpiRequest> findByFuncionarioIdOrderBySolicitadaEmDesc(Long funcionarioId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM EpiRequest r WHERE r.id = :id")
    Optional<EpiRequest> findByIdForUpdate(@Param("id") Long id);
}
