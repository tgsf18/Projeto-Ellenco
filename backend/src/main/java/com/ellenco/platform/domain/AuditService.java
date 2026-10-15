package com.ellenco.platform.domain;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public AuditLog log(String usuarioNome, String usuarioEmail, String modulo, String acao, String entidade, String registroId, String detalhes) {
        AuditLog auditLog = new AuditLog(usuarioNome, usuarioEmail, modulo, acao, entidade, registroId, detalhes);
        return auditLogRepository.save(auditLog);
    }

    public List<AuditLog> listAll() {
        return auditLogRepository.findTop50ByOrderByDataHoraDesc();
    }

    public List<AuditLog> listByModulo(String modulo) {
        return auditLogRepository.findByModuloOrderByDataHoraDesc(modulo);
    }
}
