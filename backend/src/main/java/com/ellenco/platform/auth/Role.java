package com.ellenco.platform.auth;

public enum Role {
    GLOBAL_ADMIN,
    CEO,
    ADMIN,
    SUPERVISOR,
    FUNCIONARIO;

    public boolean isPlatformAdmin() {
        return this == GLOBAL_ADMIN;
    }

    public boolean isCompanyLeadership() {
        return this == GLOBAL_ADMIN || this == CEO || this == ADMIN;
    }

    public boolean isSupervisorOrAbove() {
        return isCompanyLeadership() || this == SUPERVISOR;
    }
}
