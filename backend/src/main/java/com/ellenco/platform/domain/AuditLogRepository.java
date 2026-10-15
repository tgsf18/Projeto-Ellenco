package com.ellenco.platform.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findAllByOrderByDataHoraDesc();
    List<AuditLog> findTop50ByOrderByDataHoraDesc();
    List<AuditLog> findByModuloOrderByDataHoraDesc(String modulo);
}
