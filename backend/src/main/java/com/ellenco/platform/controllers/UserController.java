package com.ellenco.platform.controllers;

import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import com.ellenco.platform.auth.UserRepository;
import com.ellenco.platform.auth.UserService;
import com.ellenco.platform.auth.RegisterRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    public UserController(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','ADMIN','CEO')")
    public List<User> listUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','ADMIN','CEO')")
    public User createUser(@RequestBody RegisterRequest request,
                           @RequestParam(defaultValue = "SUPERVISOR") Role role,
                           @AuthenticationPrincipal User currentUser) {
        return userService.createManagedUser(request, role, currentUser);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','ADMIN','CEO')")
    public User updateRole(@PathVariable Long id,
                          @RequestBody Map<String, String> body,
                          @AuthenticationPrincipal User currentUser) {
        String roleName = body.get("role");
        if (roleName == null || roleName.isBlank()) {
            throw new IllegalArgumentException("Informe o perfil de acesso.");
        }
        final Role requestedRole;
        try {
            requestedRole = Role.valueOf(roleName.trim().toUpperCase());
        } catch (IllegalArgumentException invalidRole) {
            throw new IllegalArgumentException("Perfil de acesso inválido.");
        }
        return userService.updateRole(id, requestedRole, currentUser);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','ADMIN','CEO')")
    public ResponseEntity<User> toggleStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> body, @AuthenticationPrincipal User currentUser) {
        User target = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        if (target.getRole() == Role.GLOBAL_ADMIN && currentUser.getRole() != Role.GLOBAL_ADMIN) {
            throw new IllegalArgumentException("Apenas administradores globais podem gerenciar contas de Administrador Global.");
        }
        if (body.containsKey("ativo")) {
            target.setAtivo(body.get("ativo"));
        }
        return ResponseEntity.ok(userRepository.save(target));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public User me(@AuthenticationPrincipal User user) {
        return user;
    }

    @PatchMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public User updateMyProfile(@RequestBody Map<String, String> body, @AuthenticationPrincipal User user) {
        if (body.containsKey("nome") && !body.get("nome").isBlank()) {
            user.setNome(body.get("nome").trim());
        }
        if (body.containsKey("telefone")) {
            user.setTelefone(body.get("telefone"));
        }
        if (body.containsKey("obra")) {
            user.setObra(body.get("obra"));
        }
        if (body.containsKey("avatar")) {
            user.setAvatar(body.get("avatar"));
        }
        return userRepository.save(user);
    }
}
