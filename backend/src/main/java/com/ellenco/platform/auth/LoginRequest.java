package com.ellenco.platform.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Informe seu e-mail ou CPF")
        String email,

        @NotBlank(message = "Senha obrigatória")
        String password
) {
}
