package com.ellenco.platform.auth;

import com.ellenco.platform.domain.Employee;
import com.ellenco.platform.domain.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmployeeRepository employeeRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder, employeeRepository);
    }

    @Test
    void cadastroPublicoSempreCriaFuncionarioMesmoQuandoPedePerfilElevado() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByCpf(anyString())).thenReturn(false);
        when(employeeRepository.findByCpf("11144477735")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // CPF válido: 11144477735
        RegisterRequest request = new RegisterRequest(
                "Administrador Global",
                "admin@air.com",
                "SenhaForte123!",
                "Diretor",
                "11144477735",
                "11999999999",
                "Matriz",
                "MAT-001",
                Role.GLOBAL_ADMIN
        );

        User created = userService.registerPublicUser(request);
        assertNotNull(created);
        assertEquals(Role.FUNCIONARIO, created.getRole());
        assertEquals("admin@air.com", created.getEmail());
    }

    @Test
    void usuarioSubsequenteNoRegistroPublicoDeveSerFuncionario() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByCpf(anyString())).thenReturn(false);
        Employee activeEmp = new Employee();
        activeEmp.setCpf("11144477735");
        activeEmp.setStatus("ATIVO");
        when(employeeRepository.findByCpf("11144477735")).thenReturn(Optional.of(activeEmp));

        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RegisterRequest request = new RegisterRequest(
                "João Operário",
                "joao@empresa.com",
                "SenhaForte123!",
                "Operador",
                "11144477735",
                "11988888888",
                "Obra 01",
                "MAT-002"
        );

        User created = userService.registerPublicUser(request);
        assertNotNull(created);
        assertEquals(Role.FUNCIONARIO, created.getRole());
    }

    @Test
    void administradorPodeAlterarPerfilDeOutroUsuario() {
        User administrator = new User("Admin", "admin@empresa.com", "hash", Role.ADMIN);
        administrator.setId(1L);
        User employee = new User("João", "joao@empresa.com", "hash", Role.FUNCIONARIO);
        employee.setId(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(employee));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.updateRole(2L, Role.SUPERVISOR, administrator);

        assertEquals(Role.SUPERVISOR, updated.getRole());
    }

    @Test
    void administradorNaoPodeAtribuirPerfilGlobalNemAlterarProprioPerfil() {
        User administrator = new User("Admin", "admin@empresa.com", "hash", Role.ADMIN);
        administrator.setId(1L);
        User employee = new User("João", "joao@empresa.com", "hash", Role.FUNCIONARIO);
        employee.setId(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(employee));
        when(userRepository.findById(1L)).thenReturn(Optional.of(administrator));

        assertThrows(IllegalArgumentException.class, () -> userService.updateRole(2L, Role.GLOBAL_ADMIN, administrator));
        assertThrows(IllegalArgumentException.class, () -> userService.updateRole(1L, Role.SUPERVISOR, administrator));
    }

    @Test
    void adminDeEmpresaNaoPodeCriarGlobalAdmin() {
        User companyAdmin = new User("Admin Empresa", "admin@empresa.com", "pass", Role.ADMIN);

        RegisterRequest request = new RegisterRequest(
                "Tentativa Hacker",
                "hacker@empresa.com",
                "SenhaForte123!",
                null,
                "11144477735",
                null, null, null
        );

        assertThrows(IllegalArgumentException.class, () ->
                userService.createManagedUser(request, Role.GLOBAL_ADMIN, companyAdmin)
        );
    }

    @Test
    void cpfCadastradoPodeSerUsadoNoLogin() {
        User user = new User("João", "joao@empresa.com", "hash", Role.FUNCIONARIO);
        user.setCpf("11144477735");
        when(userRepository.findByCpf("11144477735")).thenReturn(Optional.of(user));

        assertEquals("joao@empresa.com", userService.resolveLoginIdentifier("111.444.777-35"));
        assertEquals("nao.cadastrado", userService.resolveLoginIdentifier("nao.cadastrado"));
    }

    @Test
    void rejeitaCpfInvalido() {
        RegisterRequest request = new RegisterRequest(
                "Nome Teste",
                "teste@empresa.com",
                "SenhaForte123!",
                null,
                "12345678900", // CPF inválido
                null, null, null
        );

        assertThrows(IllegalArgumentException.class, () ->
                userService.registerPublicUser(request)
        );
    }
}
