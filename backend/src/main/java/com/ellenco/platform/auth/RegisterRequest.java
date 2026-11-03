package com.ellenco.platform.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Nome obrigatório")
        String nome,

        @NotBlank(message = "E-mail obrigatório")
        @Email(message = "E-mail inválido")
        String email,

        @NotBlank(message = "Senha obrigatória")
        @Size(min = 8, message = "Senha deve ter pelo menos 8 caracteres")
        String password,

        String cargo,
        @NotBlank(message = "CPF obrigatório")
        String cpf,

        String telefone,
        String obra,
        String matricula,
        Role role
) {
    public RegisterRequest(String nome, String email, String password, String cargo, String cpf, String telefone, String obra, String matricula) {
        this(nome, email, password, cargo, cpf, telefone, obra, matricula, null);
    }
}
