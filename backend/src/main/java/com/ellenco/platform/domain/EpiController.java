package com.ellenco.platform.domain;

import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/epi")
public class EpiController {

    private final EpiDeliveryRepository repository;
    private final AuditService audit;
    private final EmployeeRepository employees;

    public EpiController(EpiDeliveryRepository r, AuditService a, EmployeeRepository e) {
        this.repository = r;
        this.audit = a;
        this.employees = e;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public List<EpiDelivery> list(@RequestParam(required = false) String cpf, @AuthenticationPrincipal User user) {
        String target = (user != null && user.getRole() == Role.FUNCIONARIO) ? user.getCpf() : cpf;
        return (target == null || target.isBlank())
                ? repository.findAllByOrderByDataEntregaDesc()
                : repository.findByFuncionarioCpfOrderByDataEntregaDesc(target);
    }

    @GetMapping("/page")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public Page<EpiDelivery> listPaged(Pageable pageable) {
        return repository.findAllByOrderByDataEntregaDesc(pageable);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
    public ResponseEntity<EpiDelivery> create(@Valid @RequestBody EpiDelivery d, @AuthenticationPrincipal User user) {
        Employee e = employees.findByCpf(d.getFuncionarioCpf()).orElseGet(() -> {
            Employee created = new Employee();
            created.setNome(d.getFuncionarioNome());
            created.setCpf(d.getFuncionarioCpf());
            return employees.save(created);
        });
        d.setFuncionarioId(e.getId());
        d.setFuncionarioNome(e.getNome());
        d.setDataEntrega(LocalDateTime.now());
        d.setResponsavelEntrega(user != null ? user.getNome() : "Sistema");
        d.setStatus("PENDENTE_ASSINATURA");
        EpiDelivery saved = repository.save(d);
        if (user != null) {
            audit.log(user.getNome(), user.getEmail(), "EPI", "ENTREGA_EPI", "EpiDelivery",
                    saved.getId().toString(), "Entrega vinculada ao funcionário " + e.getNome() + " (CPF: " + e.getCpf() + ")");
        }
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public EpiDelivery sign(@PathVariable Long id, @RequestBody(required = false) EpiDelivery body, @AuthenticationPrincipal User user) {
        EpiDelivery d = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Entrega de EPI não encontrada"));
        d.setTermoAssinado(true);
        d.setStatus("ENTREGUE");
        if (body != null && body.getAssinaturaDigital() != null) {
            d.setAssinaturaDigital(body.getAssinaturaDigital());
        }
        EpiDelivery saved = repository.save(d);
        if (user != null) {
            audit.log(user.getNome(), user.getEmail(), "EPI", "ASSINATURA_EPI", "EpiDelivery", id.toString(), "Termo de recebimento assinado digitalmente");
        }
        return saved;
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public Map<String, List<EpiDelivery>> alerts() {
        LocalDate hoje = LocalDate.now();
        List<EpiDelivery> lista = repository.findVencendoAte(hoje.plusDays(30));
        return Map.of(
                "vencidos", lista.stream().filter(EpiDelivery::isVencido).toList(),
                "proximosVencimento", lista.stream().filter(EpiDelivery::isProximoVencimento).toList()
        );
    }

    @PostMapping("/{id}/replace")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
    public EpiDelivery replace(@PathVariable Long id, @Valid @RequestBody EpiDelivery nova, @AuthenticationPrincipal User user) {
        EpiDelivery anterior = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Entrega de EPI não encontrada"));
        anterior.setStatus("SUBSTITUIDO");
        anterior.setDataDevolucao(LocalDateTime.now());
        repository.save(anterior);

        if (nova.getFuncionarioCpf() == null) nova.setFuncionarioCpf(anterior.getFuncionarioCpf());
        if (nova.getFuncionarioNome() == null || nova.getFuncionarioNome().isBlank()) nova.setFuncionarioNome(anterior.getFuncionarioNome());
        if (nova.getProdutoNome() == null || nova.getProdutoNome().isBlank()) nova.setProdutoNome(anterior.getProdutoNome());
        if (nova.getNumeroCa() == null) nova.setNumeroCa(anterior.getNumeroCa());

        EpiDelivery criada = create(nova, user).getBody();
        if (user != null) {
            audit.log(user.getNome(), user.getEmail(), "EPI", "SUBSTITUICAO_EPI", "EpiDelivery", id.toString(),
                    "EPI substituído por nova entrega #" + (criada != null ? criada.getId() : ""));
        }
        return criada;
    }
}
