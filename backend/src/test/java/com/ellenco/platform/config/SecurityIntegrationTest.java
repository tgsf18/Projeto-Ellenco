package com.ellenco.platform.config;

import com.ellenco.platform.auth.JwtService;
import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import com.ellenco.platform.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @Test
    void requisicaoSemTokenEmEndpointProtegidoDeveRetornar401Json() throws Exception {
        mockMvc.perform(get("/api/stock/products"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void cadastroComCamposInvalidosDeveRetornar400Json() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"\",\"email\":\"email-invalido\",\"password\":\"123\",\"cpf\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void funcionarioTentandoAcessarEndpointAdministrativoDeveRetornar403Json() throws Exception {
        User func = new User("Operário", "operario@empresa.com", "pass", Role.FUNCIONARIO);
        func.setId(99L);
        func.setCpf("11144477735");
        func.setAtivo(true);

        when(userRepository.findByEmail("operario@empresa.com")).thenReturn(Optional.of(func));

        String token = jwtService.generateToken("operario@empresa.com");

        // /api/users é restrito a GLOBAL_ADMIN, CEO, ADMIN
        mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void funcionarioNaoPodeAlterarPerfilDeAcesso() throws Exception {
        User func = new User("Operário", "operario@empresa.com", "pass", Role.FUNCIONARIO);
        func.setId(99L);
        func.setCpf("11144477735");
        func.setAtivo(true);
        when(userRepository.findByEmail("operario@empresa.com")).thenReturn(Optional.of(func));
        String token = jwtService.generateToken("operario@empresa.com");

        mockMvc.perform(patch("/api/users/100/role")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void rotaSpaPublicaDeveSerAcessivelParaCarregarFrontend() throws Exception {
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }
}
