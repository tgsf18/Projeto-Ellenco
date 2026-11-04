package com.ellenco.platform.auth;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, UserService userService, PasswordResetService passwordResetService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userService = userService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        String email = userService.resolveLoginIdentifier(request.email());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password())
        );

        String token = jwtService.generateToken(authentication.getName());
        User user = userService.findByEmail(email);

        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getNome(), user.getEmail(), user.getRole()));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.registerPublicUser(request);
        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getNome(), user.getEmail(), user.getRole()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgot(@RequestBody Map<String, String> body) {
        passwordResetService.request(body.get("email"));
        return ResponseEntity.ok(Map.of("message", "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> reset(@RequestBody Map<String, String> body) {
        passwordResetService.reset(body.get("token"), body.get("password"));
        return ResponseEntity.ok(Map.of("message", "Senha atualizada com sucesso."));
    }
}
