package com.ellenco.platform.domain;

import com.ellenco.platform.auth.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class InventoryOperationService {

    private final StockBalanceRepository balances;
    private final ProductRepository products;
    private final WarehouseRepository warehouses;
    private final MovementRepository movements;
    private final AuditService audit;

    public InventoryOperationService(StockBalanceRepository balances,
                                     ProductRepository products,
                                     WarehouseRepository warehouses,
                                     MovementRepository movements,
                                     AuditService audit) {
        this.balances = balances;
        this.products = products;
        this.warehouses = warehouses;
        this.movements = movements;
        this.audit = audit;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public InventoryMovement execute(InventoryOperationRequest r, User user) {
        if (r.quantidade() == null || r.quantidade().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade movimentada deve ser maior que zero.");
        }

        StockBalance origin = requiresOrigin(r.tipo()) ? resolveOriginWithLock(r) : null;
        Product product = origin != null ? origin.getProduto() :
                products.findById(required(r.produtoId(), "Informe o produto para a operação."))
                        .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado."));

        StockBalance destination = null;

        switch (r.tipo()) {
            case SAIDA -> debit(origin, r.quantidade());
            case TRANSFERENCIA -> {
                debit(origin, r.quantidade());
                destination = destination(product, r);
                credit(destination, r.quantidade());
            }
            case ENTRADA, DEVOLUCAO -> {
                destination = destination(product, r);
                credit(destination, r.quantidade());
            }
            case RESERVA -> {
                ensureAvailable(origin, r.quantidade());
                origin.setQuantidadeReservada(origin.getQuantidadeReservada().add(r.quantidade()));
                balances.save(origin);
            }
            case LIBERACAO -> {
                if (origin.getQuantidadeReservada().compareTo(r.quantidade()) < 0) {
                    throw new IllegalArgumentException("A quantidade de liberação é superior ao saldo reservado.");
                }
                origin.setQuantidadeReservada(origin.getQuantidadeReservada().subtract(r.quantidade()));
                balances.save(origin);
            }
            case BLOQUEIO -> {
                ensureAvailable(origin, r.quantidade());
                origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().add(r.quantidade()));
                origin.setStatus("BLOQUEADO_PARCIAL");
                balances.save(origin);
            }
            case DESBLOQUEIO -> {
                if (origin.getQuantidadeBloqueada().compareTo(r.quantidade()) < 0) {
                    throw new IllegalArgumentException("A quantidade de desbloqueio é superior ao saldo bloqueado.");
                }
                origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().subtract(r.quantidade()));
                origin.setStatus(origin.getQuantidadeBloqueada().signum() == 0 ? "DISPONIVEL" : "BLOQUEADO_PARCIAL");
                balances.save(origin);
            }
            case AJUSTE -> {
                origin.setQuantidadeAtual(r.quantidade());
                balances.save(origin);
            }
            default -> throw new IllegalArgumentException("Operação não permitida neste fluxo operacional.");
        }

        // Atualização consistente do produto agregada diretamente no banco de dados
        refreshProduct(product);

        String responsavel = (r.responsavelOperacao() != null && !r.responsavelOperacao().isBlank())
                ? r.responsavelOperacao()
                : (user != null ? user.getNome() : "Sistema");

        InventoryMovement movement = new InventoryMovement(
                product,
                r.tipo(),
                r.quantidade(),
                origin == null ? null : origin.getGalpao().getNome(),
                destination == null ? null : destination.getGalpao().getNome(),
                responsavel,
                r.motivo(),
                r.observacao()
        );

        movement.setSaldoOrigemId(origin == null ? null : origin.getId());
        movement.setSaldoDestinoId(destination == null ? null : destination.getId());
        movement.setLote(origin != null ? origin.getLote() : (destination != null ? destination.getLote() : r.lote()));
        movement.setLocalizacao(origin != null ? origin.getLocalizacaoPrateleira() : (destination != null ? destination.getLocalizacaoPrateleira() : r.localizacaoDestino()));
        movement.setObraId(r.obraId());
        movement.setEap(r.eap());
        movement.setFrenteServico(r.frenteServico());
        movement.setEquipe(r.equipe());
        movement.setComprovanteCodigo("MOV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        movement.setCreatedAt(LocalDateTime.now());

        InventoryMovement saved = movements.save(movement);
        if (user != null) {
            audit.log(user.getNome(), user.getEmail(), "ESTOQUE", "MOVIMENTACAO_" + r.tipo(), "InventoryMovement",
                    saved.getId().toString(), "Comprovante " + saved.getComprovanteCodigo() + " | " + r.quantidade() + " " + product.getUnidade() + " | " + product.getNome());
        }
        return saved;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public InventoryMovement reverse(Long id, String reason, User user) {
        InventoryMovement original = movements.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Movimentação não encontrada com ID: " + id));

        if (original.isEstornado()) {
            throw new IllegalArgumentException("Esta movimentação já foi estornada anteriormente.");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Informe a justificativa obrigatória do estorno.");
        }

        StockBalance origin = original.getSaldoOrigemId() == null ? null : balances.findByIdForUpdate(original.getSaldoOrigemId()).orElse(null);
        StockBalance destination = original.getSaldoDestinoId() == null ? null : balances.findByIdForUpdate(original.getSaldoDestinoId()).orElse(null);

        switch (original.getTipo()) {
            case SAIDA -> credit(origin, original.getQuantidade());
            case ENTRADA, DEVOLUCAO -> debit(destination, original.getQuantidade());
            case TRANSFERENCIA -> {
                debit(destination, original.getQuantidade());
                credit(origin, original.getQuantidade());
            }
            case RESERVA -> {
                if (origin != null) {
                    origin.setQuantidadeReservada(origin.getQuantidadeReservada().subtract(original.getQuantidade()));
                    balances.save(origin);
                }
            }
            case LIBERACAO -> {
                if (origin != null) {
                    origin.setQuantidadeReservada(origin.getQuantidadeReservada().add(original.getQuantidade()));
                    balances.save(origin);
                }
            }
            case BLOQUEIO -> {
                if (origin != null) {
                    origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().subtract(original.getQuantidade()));
                    balances.save(origin);
                }
            }
            case DESBLOQUEIO -> {
                if (origin != null) {
                    origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().add(original.getQuantidade()));
                    balances.save(origin);
                }
            }
            default -> throw new IllegalArgumentException("O estorno desta operação (" + original.getTipo() + ") requer procedimento de inventário ou ajuste manual.");
        }

        original.setEstornado(true);
        movements.save(original);

        String executor = user != null ? user.getNome() : "Sistema";
        InventoryMovement reversal = new InventoryMovement(
                original.getProduto(),
                OperationType.ESTORNO,
                original.getQuantidade(),
                original.getDestino(),
                original.getOrigem(),
                executor,
                reason,
                "Estorno referenciado do comprovante " + original.getComprovanteCodigo()
        );
        reversal.setMovimentoOrigemId(original.getId());
        reversal.setComprovanteCodigo("EST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        reversal.setCreatedAt(LocalDateTime.now());

        refreshProduct(original.getProduto());

        if (user != null) {
            audit.log(user.getNome(), user.getEmail(), "ESTOQUE", "ESTORNO", "InventoryMovement",
                    original.getId().toString(), "Estorno de " + original.getComprovanteCodigo() + ": " + reason);
        }
        return movements.save(reversal);
    }

    private StockBalance resolveOriginWithLock(InventoryOperationRequest r) {
        if (r.saldoOrigemId() != null) {
            return balances.findByIdForUpdate(r.saldoOrigemId())
                    .orElseThrow(() -> new IllegalArgumentException("Saldo de origem especificado não foi encontrado."));
        }
        if (r.produtoId() == null || r.galpaoOrigemId() == null) {
            throw new IllegalArgumentException("Informe o produto e o almoxarifado de origem.");
        }

        // Seleção de saldo por FEFO (First Expire, First Out)
        StockBalance candidate = balances.findByProdutoIdOrderByDataValidadeAsc(r.produtoId()).stream()
                .filter(b -> b.getGalpao().getId().equals(r.galpaoOrigemId())
                        && b.getQuantidadeDisponivel().signum() > 0
                        && !"BLOQUEADO".equals(b.getStatus())
                        && (b.getDataValidade() == null || !b.getDataValidade().isBefore(LocalDate.now())))
                .min(Comparator.comparing(b -> b.getDataValidade() == null ? LocalDate.MAX : b.getDataValidade()))
                .orElseThrow(() -> new IllegalArgumentException("Não há saldo ou lote disponível no galpão para atender a quantidade solicitada."));

        return balances.findByIdForUpdate(candidate.getId())
                .orElseThrow(() -> new IllegalArgumentException("Erro ao bloquear registro de saldo para atualização."));
    }

    private StockBalance destination(Product p, InventoryOperationRequest r) {
        Long warehouseId = required(r.galpaoDestinoId(), "Informe o almoxarifado de destino.");
        Warehouse w = warehouses.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Almoxarifado de destino não encontrado."));

        String lot = (r.lote() == null || r.lote().isBlank()) ? "SEM_LOTE" : r.lote().trim();
        String location = (r.localizacaoDestino() == null || r.localizacaoDestino().isBlank()) ? "NAO_ENDERECADO" : r.localizacaoDestino().trim();

        return balances.findByProdutoIdAndGalpaoIdAndLoteAndLocalizacaoPrateleira(p.getId(), warehouseId, lot, location)
                .orElseGet(() -> {
                    StockBalance b = new StockBalance();
                    b.setProduto(p);
                    b.setGalpao(w);
                    b.setLote(lot);
                    b.setLocalizacaoPrateleira(location);
                    b.setDataValidade(r.dataValidade());
                    b.setQuantidadeMinima(p.getQuantidadeMinima());
                    b.setQuantidadeAtual(BigDecimal.ZERO);
                    b.setQuantidadeReservada(BigDecimal.ZERO);
                    b.setQuantidadeBloqueada(BigDecimal.ZERO);
                    b.setStatus("DISPONIVEL");
                    return balances.save(b);
                });
    }

    private void debit(StockBalance b, BigDecimal q) {
        if (b == null) throw new IllegalArgumentException("Saldo de origem é obrigatório para operação de débito.");
        ensureAvailable(b, q);
        b.setQuantidadeAtual(b.getQuantidadeAtual().subtract(q));
        balances.save(b);
    }

    private void credit(StockBalance b, BigDecimal q) {
        if (b == null) throw new IllegalArgumentException("Saldo de destino é obrigatório para operação de crédito.");
        b.setQuantidadeAtual(b.getQuantidadeAtual().add(q));
        balances.save(b);
    }

    private void ensureAvailable(StockBalance b, BigDecimal q) {
        if (b.getDataValidade() != null && b.getDataValidade().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Lote com data de validade vencida (" + b.getDataValidade() + "). A movimentação foi impedida pelo sistema.");
        }
        if ("BLOQUEADO".equals(b.getStatus())) {
            throw new IllegalArgumentException("Este lote está totalmente bloqueado para operações.");
        }
        if (b.getQuantidadeDisponivel().compareTo(q) < 0) {
            throw new IllegalArgumentException("Saldo disponível insuficiente. Disponível no endereço: " + b.getQuantidadeDisponivel());
        }
    }

    private boolean requiresOrigin(OperationType t) {
        return List.of(OperationType.SAIDA, OperationType.TRANSFERENCIA, OperationType.RESERVA,
                OperationType.LIBERACAO, OperationType.BLOQUEIO, OperationType.DESBLOQUEIO, OperationType.AJUSTE).contains(t);
    }

    public void refreshProduct(Product p) {
        BigDecimal total = balances.sumQuantidadeByProdutoId(p.getId());
        p.setQuantidadeAtual(total);
        p.setUpdatedAt(LocalDateTime.now());
        products.save(p);
    }

    private Long required(Long v, String message) {
        if (v == null) throw new IllegalArgumentException(message);
        return v;
    }
}
