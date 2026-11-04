package com.ellenco.platform.domain;

import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/epi/requests")
public class EpiRequestController {
    private final EpiRequestRepository requests;
    private final EmployeeRepository employees;
    private final ProductRepository products;
    private final StockBalanceRepository balances;
    private final EpiController deliveries;
    private final EpiDeliveryRepository deliveryRepository;
    private final AuditService audit;

    public EpiRequestController(EpiRequestRepository requests, EmployeeRepository employees, ProductRepository products,
                                StockBalanceRepository balances, EpiController deliveries,
                                EpiDeliveryRepository deliveryRepository, AuditService audit) {
        this.requests = requests; this.employees = employees; this.products = products; this.balances = balances;
        this.deliveries = deliveries; this.deliveryRepository = deliveryRepository; this.audit = audit;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public List<EpiRequest> list(@AuthenticationPrincipal User user) {
        if (user.getRole() == Role.FUNCIONARIO) {
            Employee employee = employeeFor(user);
            return requests.findByFuncionarioIdOrderBySolicitadaEmDesc(employee.getId());
        }
        return requests.findAllByOrderBySolicitadaEmDesc();
    }

    @GetMapping("/catalog")
    @PreAuthorize("hasRole('FUNCIONARIO')")
    public List<Map<String, Object>> catalog() {
        LocalDate today = LocalDate.now();
        return products.findByIsEpi(true).stream()
                .filter(p -> p.getNumeroCa() != null && !p.getNumeroCa().isBlank() && p.getValidadeCa() != null && !p.getValidadeCa().isBefore(today))
                .map(p -> {
                    BigDecimal available = balances.findByProdutoIdOrderByDataValidadeAsc(p.getId()).stream()
                            .filter(b -> b.getDataValidade() != null && !b.getDataValidade().isBefore(today)
                                    && b.getLote() != null && !b.getLote().isBlank() && !"SEM_LOTE".equalsIgnoreCase(b.getLote())
                                    && !"BLOQUEADO".equalsIgnoreCase(b.getStatus()))
                            .map(StockBalance::getQuantidadeDisponivel).filter(q -> q.signum() > 0)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return Map.<String, Object>of("id", p.getId(), "codigo", p.getCodigo(), "nome", p.getNome(),
                            "unidade", p.getUnidade() == null ? "UN" : p.getUnidade(), "numeroCa", p.getNumeroCa(),
                            "validadeCa", p.getValidadeCa(), "quantidadeDisponivel", available);
                }).filter(p -> ((BigDecimal) p.get("quantidadeDisponivel")).signum() > 0).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('FUNCIONARIO')")
    @Transactional
    public ResponseEntity<EpiRequest> create(@Valid @RequestBody CreateRequest body, @AuthenticationPrincipal User user) {
        Employee employee = employeeFor(user);
        if (!"ATIVO".equalsIgnoreCase(employee.getStatus())) throw new IllegalArgumentException("Funcionário inativo não pode solicitar EPI.");
        Product product = products.findById(body.produtoId()).orElseThrow(() -> new IllegalArgumentException("EPI não encontrado."));
        if (!product.isEpi() || !eligibleProduct(product)) throw new IllegalArgumentException("Este produto não está elegível para solicitação de EPI.");
        BigDecimal available = eligibleBalance(product.getId());
        if (available.compareTo(BigDecimal.valueOf(body.quantidade())) < 0) throw new IllegalArgumentException("Saldo elegível insuficiente para essa quantidade.");
        EpiRequest request = new EpiRequest();
        request.setFuncionario(employee); request.setProduto(product); request.setQuantidade(body.quantidade());
        request.setMotivo(body.motivo().trim()); request.setStatus("PENDENTE");
        EpiRequest saved = requests.save(request);
        audit.log(user.getNome(), user.getEmail(), "EPI", "SOLICITACAO_CRIADA", "EpiRequest", saved.getId().toString(),
                employee.getNome() + " solicitou " + body.quantidade() + " × " + product.getNome());
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
    @Transactional
    public EpiRequest approve(@PathVariable Long id, @Valid @RequestBody ApproveRequest body, @AuthenticationPrincipal User user) {
        EpiRequest request = pending(id);
        StockBalance balance = balances.findById(body.saldoEstoqueId()).orElseThrow(() -> new IllegalArgumentException("Lote de estoque não encontrado."));
        if (!balance.getProduto().getId().equals(request.getProduto().getId())) throw new IllegalArgumentException("O lote selecionado não pertence ao EPI solicitado.");
        if (balance.getQuantidadeDisponivel().compareTo(BigDecimal.valueOf(request.getQuantidade())) < 0) throw new IllegalArgumentException("O saldo mudou e não atende mais à solicitação.");
        EpiDelivery delivery = new EpiDelivery();
        delivery.setFuncionarioCpf(request.getFuncionario().getCpf()); delivery.setFuncionarioNome(request.getFuncionario().getNome());
        delivery.setProdutoNome(request.getProduto().getNome()); delivery.setNumeroCa(request.getProduto().getNumeroCa());
        delivery.setSaldoEstoqueId(balance.getId()); delivery.setQuantidade(request.getQuantidade());
        delivery.setDataPrevisaoTroca(body.dataPrevisaoTroca());
        delivery.setObservacoes("Solicitação #" + request.getId() + " aprovada. Motivo: " + request.getMotivo());
        ResponseEntity<EpiDelivery> response = deliveries.create(delivery, user);
        EpiDelivery savedDelivery = response.getBody();
        if (savedDelivery == null) throw new IllegalStateException("A entrega não foi criada.");
        request.setEntrega(deliveryRepository.findById(savedDelivery.getId()).orElse(savedDelivery));
        request.setStatus("APROVADA"); request.setAnalisadaPor(user); request.setAnalisadaPorNome(user.getNome());
        request.setAnalisadaEm(LocalDateTime.now()); request.setObservacaoDecisao(body.observacao());
        EpiRequest saved = requests.save(request);
        audit.log(user.getNome(), user.getEmail(), "EPI", "SOLICITACAO_APROVADA", "EpiRequest", id.toString(),
                "Entrega de EPI #" + savedDelivery.getId() + " criada e estoque baixado.");
        return saved;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR')")
    @Transactional
    public EpiRequest reject(@PathVariable Long id, @Valid @RequestBody DecisionRequest body, @AuthenticationPrincipal User user) {
        EpiRequest request = pending(id);
        request.setStatus("REJEITADA"); request.setAnalisadaPor(user); request.setAnalisadaPorNome(user.getNome());
        request.setAnalisadaEm(LocalDateTime.now()); request.setObservacaoDecisao(body.observacao().trim());
        EpiRequest saved = requests.save(request);
        audit.log(user.getNome(), user.getEmail(), "EPI", "SOLICITACAO_REJEITADA", "EpiRequest", id.toString(), body.observacao().trim());
        return saved;
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('FUNCIONARIO')")
    @Transactional
    public EpiRequest cancel(@PathVariable Long id, @AuthenticationPrincipal User user) {
        EpiRequest request = pending(id);
        Employee employee = employeeFor(user);
        if (!request.getFuncionario().getId().equals(employee.getId())) throw new org.springframework.security.access.AccessDeniedException("Você só pode cancelar sua própria solicitação.");
        request.setStatus("CANCELADA"); request.setAnalisadaEm(LocalDateTime.now()); request.setObservacaoDecisao("Cancelada pelo solicitante.");
        EpiRequest saved = requests.save(request);
        audit.log(user.getNome(), user.getEmail(), "EPI", "SOLICITACAO_CANCELADA", "EpiRequest", id.toString(), "Solicitação cancelada pelo funcionário.");
        return saved;
    }

    private EpiRequest pending(Long id) {
        EpiRequest request = requests.findByIdForUpdate(id).orElseThrow(() -> new IllegalArgumentException("Solicitação de EPI não encontrada."));
        if (!"PENDENTE".equals(request.getStatus())) throw new IllegalArgumentException("Esta solicitação já foi analisada.");
        return request;
    }
    private Employee employeeFor(User user) {
        if (user == null || user.getCpf() == null) throw new org.springframework.security.access.AccessDeniedException("Conta sem CPF associado ao RH.");
        return employees.findByCpf(user.getCpf()).orElseThrow(() -> new IllegalArgumentException("Seu CPF não está vinculado a um funcionário ativo no RH."));
    }
    private boolean eligibleProduct(Product product) {
        return product.getValidadeCa() != null && !product.getValidadeCa().isBefore(LocalDate.now());
    }
    private BigDecimal eligibleBalance(Long productId) {
        LocalDate today = LocalDate.now();
        return balances.findByProdutoIdOrderByDataValidadeAsc(productId).stream()
                .filter(b -> b.getDataValidade() != null && !b.getDataValidade().isBefore(today)
                        && b.getLote() != null && !b.getLote().isBlank() && !"SEM_LOTE".equalsIgnoreCase(b.getLote())
                        && !"BLOQUEADO".equalsIgnoreCase(b.getStatus()))
                .map(StockBalance::getQuantidadeDisponivel).filter(q -> q.signum() > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public record CreateRequest(@NotNull Long produtoId, @NotNull @Min(1) Integer quantidade, @NotBlank @Size(max = 1800) String motivo) {}
    public record ApproveRequest(@NotNull Long saldoEstoqueId, @NotNull LocalDate dataPrevisaoTroca, @Size(max = 2000) String observacao) {}
    public record DecisionRequest(@NotBlank @Size(max = 2000) String observacao) {}
}
