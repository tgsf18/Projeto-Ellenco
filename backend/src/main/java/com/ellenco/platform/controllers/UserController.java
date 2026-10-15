package com.ellenco.platform.controllers;

import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import com.ellenco.platform.auth.UserRepository;
import com.ellenco.platform.auth.UserService;
import com.ellenco.platform.auth.RegisterRequest;
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
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> listUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public User createUser(@RequestBody RegisterRequest request, @RequestParam(defaultValue = "SUPERVISOR") Role role) {
        return userService.createUser(request, role);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public User me(@AuthenticationPrincipal User user) { return user; }

    @PatchMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public User updateMyProfile(@RequestBody Map<String, String> body, @AuthenticationPrincipal User user) {
        if (body.containsKey("nome") && !body.get("nome").isBlank()) user.setNome(body.get("nome").trim());
        if (body.containsKey("telefone")) user.setTelefone(body.get("telefone"));
        if (body.containsKey("obra")) user.setObra(body.get("obra"));
        if (body.containsKey("avatar")) user.setAvatar(body.get("avatar"));
        return userRepository.save(user);
    }
}
