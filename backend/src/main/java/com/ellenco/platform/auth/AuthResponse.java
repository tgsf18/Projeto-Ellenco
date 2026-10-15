package com.ellenco.platform.auth;

public record AuthResponse(
        String token,
        Long userId,
        String nome,
        String email,
        Role role
) {
}
