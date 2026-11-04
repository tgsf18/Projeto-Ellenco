package com.ellenco.platform.domain;

import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
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
    private final StockBalanceRepository balances;
    private final InventoryOperationService inventory;

    public EpiController(EpiDeliveryRepository r, AuditService a, EmployeeRepository e,
                         StockBalanceRepository b, InventoryOperationService inventory) {
        this.repository = r;
        this.audit = a;
        this.employees = e;
        this.balances = b;
        this.inventory = inventory;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public List<EpiDelivery> list(@RequestParam(required = false) String cpf, @AuthenticationPrincipal User user) {
        if (user != null && user.getRole() == Role.FUNCIONARIO && (user.getCpf() == null || user.getCpf().isBlank())) {
            return List.of();
        }
        String target = (user != null && user.getRole() == Role.FUNCIONARIO) ? user.getCpf() : cpf;
        return (target == null || target.isBlank())
                ? repository.findAllByOrderByDataEntregaDesc()
                : repository.findByFuncionarioCpfOrderByDataEntregaDesc(target);
    }

    @GetMapping("/page")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public Page<EpiDelivery> listPaged(Pageable pageable, @AuthenticationPrincipal User user) {
        if (user != null && user.getRole() == Role.FUNCIONARIO) {
            if (user.getCpf() == null || user.getCpf().isBlank()) return Page.empty(pageable);
            return repository.findByFuncionarioCpfOrderByDataEntregaDesc(user.getCpf(), pageable);
        }
        return repository.findAllByOrderByDataEntregaDesc(pageable);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
    @Transactional
    public ResponseEntity<EpiDelivery> create(@Valid @RequestBody EpiDelivery d, @AuthenticationPrincipal User user) {
        Employee e = employees.findByCpf(d.getFuncionarioCpf())
                .orElseThrow(() -> new IllegalArgumentException("Selecione um funcionário cadastrado no RH antes de registrar a entrega."));
        if (!"ATIVO".equalsIgnoreCase(e.getStatus())) {
            throw new IllegalArgumentException("Não é possível entregar EPI a um funcionário inativo.");
        }
        if (d.getSaldoEstoqueId() == null) {
            throw new IllegalArgumentException("Selecione um lote de EPI disponível no estoque.");
        }
        if (d.getQuantidade() == null || d.getQuantidade() < 1) {
            throw new IllegalArgumentException("A quantidade deve ser pelo menos 1.");
        }
        StockBalance balance = balances.findById(d.getSaldoEstoqueId())
                .orElseThrow(() -> new IllegalArgumentException("Lote de estoque não encontrado."));
        Product product = balance.getProduto();
        if (!product.isEpi()) {
            throw new IllegalArgumentException("O produto selecionado não está cadastrado como EPI.");
        }
        if (product.getNumeroCa() == null || product.getNumeroCa().isBlank() ||
                product.getValidadeCa() == null || product.getValidadeCa().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("O produto precisa ter CA cadastrado e dentro da validade.");
        }
        if (balance.getLote() == null || balance.getLote().isBlank() || "SEM_LOTE".equalsIgnoreCase(balance.getLote())) {
            throw new IllegalArgumentException("A entrega exige um lote de estoque identificado.");
        }
        if (balance.getDataValidade() == null || balance.getDataValidade().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("O lote selecionado está sem validade ou vencido.");
        }
        if (d.getDataPrevisaoTroca() == null || d.getDataPrevisaoTroca().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Informe uma previsão de troca válida.");
        }
        if (d.getDataPrevisaoTroca().isAfter(balance.getDataValidade()) || d.getDataPrevisaoTroca().isAfter(product.getValidadeCa())) {
            throw new IllegalArgumentException("A troca prevista não pode ultrapassar a validade do lote ou do CA.");
        }

        InventoryMovement movement = inventory.execute(new InventoryOperationRequest(
                OperationType.SAIDA, product.getId(), balance.getId(), balance.getGalpao().getId(), null,
                balance.getLote(), balance.getLocalizacaoPrateleira(), null, null,
                java.math.BigDecimal.valueOf(d.getQuantidade()), e.getObra() != null ? e.getObra().getId() : null,
                null, null, null, user != null ? user.getNome() : "Sistema",
                "Entrega de EPI para " + e.getNome(), "CPF " + e.getCpf() + " · CA " + product.getNumeroCa()
        ), user);
        d.setFuncionarioId(e.getId());
        d.setFuncionarioNome(e.getNome());
        d.setProdutoId(product.getId());
        d.setProdutoNome(product.getNome());
        d.setNumeroCa(product.getNumeroCa());
        d.setSaldoEstoqueId(balance.getId());
        d.setMovimentoEstoqueId(movement.getId());
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
        if (user != null && user.getRole() == Role.FUNCIONARIO &&
                (user.getCpf() == null || !user.getCpf().equals(d.getFuncionarioCpf()))) {
            throw new org.springframework.security.access.AccessDeniedException("Você só pode assinar o recebimento do seu próprio EPI.");
        }
        if (d.isTermoAssinado() || !"PENDENTE_ASSINATURA".equals(d.getStatus())) {
            throw new IllegalArgumentException("Esta entrega não está aguardando assinatura.");
        }
        if (body == null || body.getAssinaturaDigital() == null || body.getAssinaturaDigital().isBlank()) {
            throw new IllegalArgumentException("A confirmação digital da assinatura é obrigatória.");
        }
        d.setTermoAssinado(true);
        d.setStatus("ENTREGUE");
        d.setAssinaturaDigital(body.getAssinaturaDigital());
        EpiDelivery saved = repository.save(d);
        if (user != null) {
            audit.log(user.getNome(), user.getEmail(), "EPI", "ASSINATURA_EPI", "EpiDelivery", id.toString(), "Termo de recebimento assinado digitalmente");
        }
        return saved;
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public Map<String, List<EpiDelivery>> alerts(@AuthenticationPrincipal User user) {
        LocalDate hoje = LocalDate.now();
        List<EpiDelivery> lista = repository.findVencendoAte(hoje.plusDays(30));
        if (user != null && user.getRole() == Role.FUNCIONARIO) {
            lista = lista.stream().filter(d -> user.getCpf() != null && user.getCpf().equals(d.getFuncionarioCpf())).toList();
        }
        return Map.of(
                "vencidos", lista.stream().filter(EpiDelivery::isVencido).toList(),
                "proximosVencimento", lista.stream().filter(EpiDelivery::isProximoVencimento).toList()
        );
    }

    @PostMapping("/{id}/replace")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
    @Transactional
    public EpiDelivery replace(@PathVariable Long id, @Valid @RequestBody EpiDelivery nova, @AuthenticationPrincipal User user) {
        EpiDelivery anterior = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Entrega de EPI não encontrada"));
        if (!"ENTREGUE".equals(anterior.getStatus()) || !anterior.isTermoAssinado()) {
            throw new IllegalArgumentException("Somente uma entrega concluída e assinada pode ser substituída.");
        }
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
