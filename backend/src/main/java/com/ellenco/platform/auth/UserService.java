package com.ellenco.platform.auth;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    public User createUser(RegisterRequest request) { return createUser(request, Role.FUNCIONARIO); }

    @Transactional
    public synchronized User createUser(RegisterRequest request, Role role) {
        if (userRepository.existsByEmail(request.email())) throw new IllegalArgumentException("E-mail já cadastrado");
        String cpf = normalizeCpf(request.cpf());
        if (!validCpf(cpf)) throw new IllegalArgumentException("CPF inválido");
        if (userRepository.existsByCpf(cpf)) throw new IllegalArgumentException("CPF já possui acesso cadastrado");
        boolean firstUser = userRepository.count() == 0;
        if (!firstUser) employeeRepository.findByCpf(cpf).filter(e -> "ATIVO".equalsIgnoreCase(e.getStatus())).orElseThrow(() -> new IllegalArgumentException("CPF não encontrado entre os funcionários ativos. Procure o RH."));
        User user = new User();
        user.setNome(request.nome()); user.setEmail(request.email()); user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(firstUser ? Role.ADMIN : Role.FUNCIONARIO); user.setCpf(cpf); user.setTelefone(request.telefone()); user.setObra(request.obra()); user.setMatricula(request.matricula());
        return userRepository.save(user);
    }

    public void updatePassword(User user,String password){if(password==null||password.length()<10)throw new IllegalArgumentException("A senha deve ter pelo menos 10 caracteres.");user.setPassword(passwordEncoder.encode(password));userRepository.save(user);}
    private String normalizeCpf(String cpf){return cpf==null?"":cpf.replaceAll("\\D","");}
    private boolean validCpf(String cpf){if(cpf.length()!=11||cpf.chars().distinct().count()==1)return false;int sum=0;for(int i=0;i<9;i++)sum+=(cpf.charAt(i)-48)*(10-i);int d1=11-(sum%11);if(d1>=10)d1=0;sum=0;for(int i=0;i<10;i++)sum+=(cpf.charAt(i)-48)*(11-i);int d2=11-(sum%11);if(d2>=10)d2=0;return d1==cpf.charAt(9)-48&&d2==cpf.charAt(10)-48;}

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .build();
    }
}
