package com.ellenco.platform.auth;

import com.ellenco.platform.domain.Employee;
import com.ellenco.platform.domain.JobFunctionCatalog;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.ellenco.platform.domain.EmployeeRepository employeeRepository;

    public UserService(UserRepository userRepository, @Lazy PasswordEncoder passwordEncoder, com.ellenco.platform.domain.EmployeeRepository employeeRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.employeeRepository = employeeRepository;
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
    }

    public String resolveLoginIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) return "";
        String value = identifier.trim();
        if (value.contains("@")) return value.toLowerCase();
        String cpf = normalizeCpf(value);
        if (validCpf(cpf)) {
            return userRepository.findByCpf(cpf).map(User::getEmail).orElse(value);
        }
        return value.toLowerCase();
    }

    public User createUser(RegisterRequest request) {
        return registerPublicUser(request);
    }

    @Transactional
    public synchronized User registerPublicUser(RegisterRequest request) {
        validateNewUser(request);
        String cpf = normalizeCpf(request.cpf());

        // O cadastro público sempre cria acesso de funcionário. O perfil não vem do corpo da requisição.
        if (employeeRepository.findByCpf(cpf).isEmpty()) {
            Employee emp = new Employee();
            emp.setNome(request.nome().trim());
            emp.setCpf(cpf);
            emp.setTelefone(request.telefone());
            emp.setFuncao(JobFunctionCatalog.canonicalize(request.cargo()));
            emp.setStatus("ATIVO");
            employeeRepository.save(emp);
        }

        User user = new User();
        user.setNome(request.nome().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.FUNCIONARIO);
        user.setCpf(cpf);
        user.setTelefone(request.telefone());
        user.setObra(request.obra());
        user.setMatricula(request.matricula());
        return userRepository.save(user);
    }

    @Transactional
    public synchronized User createManagedUser(RegisterRequest request, Role requestedRole, User creator) {
        if (creator == null) {
            throw new IllegalArgumentException("Usuário autenticado obrigatório para cadastro administrativo.");
        }

        validateNewUser(request);
        Role targetRole = requestedRole != null ? requestedRole : Role.FUNCIONARIO;

        // Somente o administrador global pode conceder ou administrar os perfis de diretoria e plataforma.
        if ((targetRole == Role.GLOBAL_ADMIN || targetRole == Role.CEO) && creator.getRole() != Role.GLOBAL_ADMIN) {
            throw new IllegalArgumentException("Somente um administrador global pode conceder perfis de diretoria ou plataforma.");
        }

        String cpf = normalizeCpf(request.cpf());

        // Garante cadastro na tabela de funcionários sem travas
        if (employeeRepository.findByCpf(cpf).isEmpty()) {
            Employee emp = new Employee();
            emp.setNome(request.nome().trim());
            emp.setCpf(cpf);
            emp.setTelefone(request.telefone());
            emp.setFuncao(JobFunctionCatalog.canonicalize(request.cargo()));
            emp.setStatus("ATIVO");
            employeeRepository.save(emp);
        }

        User user = new User();
        user.setNome(request.nome().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(targetRole);
        user.setCpf(cpf);
        user.setTelefone(request.telefone());
        user.setObra(request.obra());
        user.setMatricula(request.matricula());
        return userRepository.save(user);
    }

    @Transactional
    public User updateRole(Long userId, Role requestedRole, User actor) {
        if (actor == null || requestedRole == null) {
            throw new IllegalArgumentException("Usuário autenticado e perfil de acesso são obrigatórios.");
        }
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        if ((requestedRole == Role.GLOBAL_ADMIN || target.getRole() == Role.GLOBAL_ADMIN)
                && actor.getRole() != Role.GLOBAL_ADMIN) {
            throw new IllegalArgumentException("Somente um administrador global pode alterar esse perfil.");
        }
        if (actor.getRole() != Role.GLOBAL_ADMIN && requestedRole == Role.CEO) {
            throw new IllegalArgumentException("Somente um administrador global pode atribuir o perfil de diretoria.");
        }
        if (Objects.equals(actor.getId(), target.getId()) && requestedRole != actor.getRole()) {
            throw new IllegalArgumentException("Você não pode alterar o próprio perfil de acesso.");
        }

        target.setRole(requestedRole);
        return userRepository.save(target);
    }

    private void validateNewUser(RegisterRequest request) {
        if (request.email() == null || request.email().isBlank()) {
            throw new IllegalArgumentException("E-mail é obrigatório.");
        }
        if (userRepository.existsByEmail(request.email().trim().toLowerCase())) {
            throw new IllegalArgumentException("E-mail já cadastrado.");
        }
        String cpf = normalizeCpf(request.cpf());
        if (!validCpf(cpf)) {
            throw new IllegalArgumentException("CPF inválido.");
        }
        if (userRepository.existsByCpf(cpf)) {
            throw new IllegalArgumentException("CPF já possui acesso cadastrado no sistema.");
        }
        if (request.password() == null || request.password().length() < 8) {
            throw new IllegalArgumentException("A senha deve possuir no mínimo 8 caracteres.");
        }
    }

    public void updatePassword(User user, String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 8 caracteres.");
        }
        user.setPassword(passwordEncoder.encode(password));
        userRepository.save(user);
    }

    public String normalizeCpf(String cpf) {
        return cpf == null ? "" : cpf.replaceAll("\\D", "");
    }

    public boolean validCpf(String cpf) {
        if (cpf == null || cpf.length() != 11 || cpf.chars().distinct().count() == 1) return false;
        int sum = 0;
        for (int i = 0; i < 9; i++) sum += (cpf.charAt(i) - '0') * (10 - i);
        int d1 = 11 - (sum % 11);
        if (d1 >= 10) d1 = 0;
        sum = 0;
        for (int i = 0; i < 10; i++) sum += (cpf.charAt(i) - '0') * (11 - i);
        int d2 = 11 - (sum % 11);
        if (d2 >= 10) d2 = 0;
        return d1 == (cpf.charAt(9) - '0') && d2 == (cpf.charAt(10) - '0');
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username.trim().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado com e-mail: " + username));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .disabled(!user.isAtivo())
                .build();
    }
}
