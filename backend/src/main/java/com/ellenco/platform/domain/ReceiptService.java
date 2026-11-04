package com.ellenco.platform.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final ProductRepository productRepository;
    private final MovementRepository movementRepository;
    private final StockBalanceRepository balanceRepository;
    private final WarehouseRepository warehouseRepository;
    private final AuditService auditService;
    private final SupplierRepository supplierRepository;

    public ReceiptService(ReceiptRepository receiptRepository,
                          ReceiptItemRepository receiptItemRepository,
                          ProductRepository productRepository,
                          MovementRepository movementRepository,
                          StockBalanceRepository balanceRepository,
                          WarehouseRepository warehouseRepository,
                          AuditService auditService,
                          SupplierRepository supplierRepository) {
        this.receiptRepository = receiptRepository;
        this.receiptItemRepository = receiptItemRepository;
        this.productRepository = productRepository;
        this.movementRepository = movementRepository;
        this.balanceRepository = balanceRepository;
        this.warehouseRepository = warehouseRepository;
        this.auditService = auditService;
        this.supplierRepository = supplierRepository;
    }

    public List<Receipt> listAll() {
        return receiptRepository.findAllByOrderByDataRecebimentoDesc();
    }

    public Page<Receipt> listPaged(Pageable pageable) {
        return receiptRepository.findAllByOrderByDataRecebimentoDesc(pageable);
    }

    public Receipt getById(Long id) {
        return receiptRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recebimento não encontrado"));
    }

    @Transactional
    public Receipt createReceipt(Receipt receipt, String userEmail, String userNome) {
        if (receipt.getFornecedorId() == null) {
            throw new IllegalArgumentException("Selecione um fornecedor cadastrado.");
        }
        Supplier supplier = supplierRepository.findById(receipt.getFornecedorId())
                .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado."));
        if (!"ATIVO".equalsIgnoreCase(supplier.getStatus())) {
            throw new IllegalArgumentException("O fornecedor selecionado está inativo.");
        }
        if (receipt.getNumeroNota() == null || receipt.getNumeroNota().isBlank()) {
            throw new IllegalArgumentException("O número da nota fiscal é obrigatório.");
        }
        if (receiptRepository.existsByFornecedorIdAndNumeroNota(receipt.getFornecedorId(), receipt.getNumeroNota().trim())) {
            throw new IllegalArgumentException("Esta nota já foi registrada para o fornecedor selecionado.");
        }
        Warehouse warehouse = receipt.getGalpaoId() == null ? null : warehouseRepository.findById(receipt.getGalpaoId()).orElse(null);
        if (warehouse == null || !"ATIVO".equalsIgnoreCase(warehouse.getStatus())) {
            throw new IllegalArgumentException("Selecione um galpão ativo cadastrado.");
        }
        if (receipt.getItens() == null || receipt.getItens().isEmpty()) {
            throw new IllegalArgumentException("Adicione ao menos um produto cadastrado ao recebimento.");
        }
        receipt.setFornecedor(supplier.getNomeFantasia() != null && !supplier.getNomeFantasia().isBlank()
                ? supplier.getNomeFantasia() : supplier.getRazaoSocial());
        receipt.setNumeroNota(receipt.getNumeroNota().trim());
        receipt.setGalpaoDestinoNome(warehouse.getNome());
        receipt.setDataRecebimento(LocalDateTime.now());
        receipt.setResponsavelRecebimento(userNome != null ? userNome : userEmail);
        receipt.setStatus("AGUARDANDO_CONFERENCIA");

        Set<String> productLots = new HashSet<>();
        for (ReceiptItem item : receipt.getItens()) {
            if (item.getProdutoId() == null || item.getQuantidadeNota() == null || item.getQuantidadeNota().signum() <= 0) {
                throw new IllegalArgumentException("Cada linha deve selecionar um produto cadastrado e informar quantidade positiva.");
            }
            Product product = productRepository.findById(item.getProdutoId())
                    .orElseThrow(() -> new IllegalArgumentException("Um dos produtos selecionados não existe mais no catálogo."));
            String lot = item.getLote() == null ? "" : item.getLote().trim();
            if (!productLots.add(product.getId() + "|" + lot.toLowerCase())) {
                throw new IllegalArgumentException("O mesmo produto e lote não podem aparecer mais de uma vez na nota.");
            }
            if (product.isEpi()) {
                if (lot.isBlank() || "SEM_LOTE".equalsIgnoreCase(lot) || item.getDataValidade() == null ||
                        item.getDataValidade().isBefore(LocalDate.now())) {
                    throw new IllegalArgumentException("EPI recebido exige lote identificado e validade futura do lote.");
                }
                if (product.getNumeroCa() == null || product.getNumeroCa().isBlank() || product.getValidadeCa() == null ||
                        product.getValidadeCa().isBefore(LocalDate.now())) {
                    throw new IllegalArgumentException("EPI recebido exige CA cadastrado e dentro da validade.");
                }
            }
            item.setProdutoCodigo(product.getCodigo());
            item.setProdutoNome(product.getNome());
            item.setUnidade(product.getUnidade());
            item.setLote(lot.isBlank() ? "SEM_LOTE" : lot);
            item.setReceipt(receipt);
            item.setStatusItem("PENDENTE");
            if (item.getQuantidadeConferida() == null) item.setQuantidadeConferida(BigDecimal.ZERO);
        }

        Receipt saved = receiptRepository.save(receipt);
        auditService.log(userNome, userEmail, "RECEBIMENTOS", "CRIACAO_RECEBIMENTO", "Receipt", saved.getId().toString(),
                "Criado recebimento NF: " + saved.getNumeroNota() + " do fornecedor " + saved.getFornecedor());
        return saved;
    }

    @Transactional
    public Receipt startConference(Long id, String userEmail, String userNome) {
        Receipt r = getById(id);
        if (!"AGUARDANDO_CONFERENCIA".equals(r.getStatus())) {
            throw new IllegalArgumentException("Este recebimento já foi aberto para conferência ou finalizado.");
        }
        r.setStatus("EM_CONFERENCIA");
        r.setDataConferencia(LocalDateTime.now());
        r.setResponsavelConferencia(userNome != null ? userNome : userEmail);
        Receipt updated = receiptRepository.save(r);
        auditService.log(userNome, userEmail, "RECEBIMENTOS", "INICIO_CONFERENCIA", "Receipt", id.toString(),
                "Iniciada conferência da NF: " + r.getNumeroNota() + " por " + userNome);
        return updated;
    }

    @Transactional
    public ReceiptItem updateItemConference(Long receiptId, Long itemId, BigDecimal qtdConferida, String statusItem, String motivoDivergencia, String userEmail, String userNome) {
        ReceiptItem item = receiptItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item do recebimento não encontrado"));

        item.setQuantidadeConferida(qtdConferida != null ? qtdConferida : BigDecimal.ZERO);
        item.setStatusItem(statusItem != null ? statusItem : "CONFERIDO_OK");
        item.setMotivoDivergencia(motivoDivergencia);

        ReceiptItem saved = receiptItemRepository.save(item);
        auditService.log(userNome, userEmail, "RECEBIMENTOS", "CONFERENCIA_ITEM", "ReceiptItem", itemId.toString(),
                "Conferido item " + item.getProdutoNome() + ": Qtd NF=" + item.getQuantidadeNota() + ", Qtd Conferida=" + item.getQuantidadeConferida() + ", Status=" + item.getStatusItem());
        return saved;
    }

    @Transactional
    public Receipt finalizeReceipt(Long id, String statusFinal, String observacoes, String fotoUrl, String userEmail, String userNome) {
        Receipt r = getById(id);
        if (!List.of("AGUARDANDO_CONFERENCIA", "EM_CONFERENCIA").contains(r.getStatus())) {
            throw new IllegalArgumentException("Este recebimento já foi finalizado e não pode gerar uma segunda entrada de estoque.");
        }

        if (statusFinal == null || statusFinal.isBlank()) {
            boolean hasDivergence = r.getItens().stream().anyMatch(i -> "DIVERGENCIA".equalsIgnoreCase(i.getStatusItem()) || "AVARIADO".equalsIgnoreCase(i.getStatusItem()));
            statusFinal = hasDivergence ? "COM_DIVERGENCIAS" : "APROVADO";
        }

        r.setStatus(statusFinal);
        if (observacoes != null) r.setObservacoes(observacoes);
        if (fotoUrl != null) r.setFotoComprovanteUrl(fotoUrl);
        if (r.getDataConferencia() == null) r.setDataConferencia(LocalDateTime.now());
        if (r.getResponsavelConferencia() == null) r.setResponsavelConferencia(userNome != null ? userNome : userEmail);

        // Se o recebimento foi aprovado ou com divergências aceitas, dá entrada consistente no estoque
        if ("APROVADO".equalsIgnoreCase(statusFinal) || "COM_DIVERGENCIAS".equalsIgnoreCase(statusFinal)) {
            Warehouse targetWarehouse = null;
            if (r.getGalpaoId() != null) {
                targetWarehouse = warehouseRepository.findById(r.getGalpaoId()).orElse(null);
            }
            if (targetWarehouse == null) {
                targetWarehouse = warehouseRepository.findAll().stream().findFirst().orElse(null);
            }

            for (ReceiptItem item : r.getItens()) {
                if (item.getProdutoId() != null) {
                    final Warehouse finalWh = targetWarehouse;
                    productRepository.findById(item.getProdutoId()).ifPresent(prod -> {
                        if (item.getDataValidade() != null && item.getDataValidade().isBefore(LocalDate.now())) {
                            throw new IllegalArgumentException("Lote vencido não pode entrar no estoque: " + prod.getNome());
                        }
                        if (prod.isEpi() && (item.getDataValidade() == null || item.getLote() == null ||
                                "SEM_LOTE".equalsIgnoreCase(item.getLote()) || prod.getValidadeCa() == null ||
                                prod.getValidadeCa().isBefore(LocalDate.now()))) {
                            throw new IllegalArgumentException("EPI exige lote e CA válidos para ser recebido no estoque.");
                        }
                        BigDecimal qtdEntrada = item.getQuantidadeConferida().compareTo(BigDecimal.ZERO) > 0 ?
                                item.getQuantidadeConferida() : item.getQuantidadeNota();

                        Warehouse wh = (finalWh != null) ? finalWh : prod.getGalpao();

                        StockBalance balance = null;
                        if (wh != null) {
                            String lot = (item.getLote() == null || item.getLote().isBlank()) ? "SEM_LOTE" : item.getLote().trim();
                            String location = (prod.getLocalizacaoPrateleira() == null || prod.getLocalizacaoPrateleira().isBlank()) ? "NAO_ENDERECADO" : prod.getLocalizacaoPrateleira().trim();

                            balance = balanceRepository.findByProdutoIdAndGalpaoIdAndLoteAndLocalizacaoPrateleira(prod.getId(), wh.getId(), lot, location)
                                    .orElseGet(() -> {
                                        StockBalance b = new StockBalance();
                                        b.setProduto(prod);
                                        b.setGalpao(wh);
                                        b.setLote(lot);
                                        b.setLocalizacaoPrateleira(location);
                                        b.setQuantidadeMinima(prod.getQuantidadeMinima());
                                        b.setQuantidadeAtual(BigDecimal.ZERO);
                                        b.setQuantidadeReservada(BigDecimal.ZERO);
                                        b.setQuantidadeBloqueada(BigDecimal.ZERO);
                                        b.setStatus("DISPONIVEL");
                                        return b;
                                    });

                            balance.setDataValidade(item.getDataValidade() != null ? item.getDataValidade() : balance.getDataValidade());
                            balance.setQuantidadeAtual(balance.getQuantidadeAtual().add(qtdEntrada));
                            balance = balanceRepository.save(balance);

                            // Recalcula o saldo total de forma agregada
                            BigDecimal totalSaldos = balanceRepository.sumQuantidadeByProdutoId(prod.getId());
                            prod.setQuantidadeAtual(totalSaldos);
                        } else {
                            prod.setQuantidadeAtual(prod.getQuantidadeAtual().add(qtdEntrada));
                        }

                        prod.setUpdatedAt(LocalDateTime.now());
                        productRepository.save(prod);

                        InventoryMovement mov = new InventoryMovement(
                                prod,
                                OperationType.ENTRADA,
                                qtdEntrada,
                                r.getFornecedor() + " (NF " + r.getNumeroNota() + ")",
                                r.getGalpaoDestinoNome() != null ? r.getGalpaoDestinoNome() : (wh != null ? wh.getNome() : "Almoxarifado"),
                                userNome != null ? userNome : userEmail,
                                "Recebimento NF " + r.getNumeroNota(),
                                "Entrada automática gerada pela conferência do recebimento #" + r.getId()
                        );
                        if (balance != null) {
                            mov.setSaldoDestinoId(balance.getId());
                            mov.setLote(balance.getLote());
                            mov.setLocalizacao(balance.getLocalizacaoPrateleira());
                        }
                        mov.setComprovanteCodigo("REC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                        mov.setCreatedAt(LocalDateTime.now());
                        movementRepository.save(mov);
                    });
                }
            }
        }

        Receipt saved = receiptRepository.save(r);
        auditService.log(userNome, userEmail, "RECEBIMENTOS", "FINALIZACAO_RECEBIMENTO", "Receipt", id.toString(),
                "Finalizado recebimento NF: " + r.getNumeroNota() + " com status: " + statusFinal);
        return saved;
    }
}
