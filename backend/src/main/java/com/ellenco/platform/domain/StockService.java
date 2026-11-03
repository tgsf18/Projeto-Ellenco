package com.ellenco.platform.domain;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class StockService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final WarehouseRepository warehouseRepository;
    private final MovementRepository movementRepository;
    private final StockBalanceRepository stockBalanceRepository;
    private final AuditService auditService;

    public StockService(ProductRepository productRepository,
                        CategoryRepository categoryRepository,
                        WarehouseRepository warehouseRepository,
                        MovementRepository movementRepository,
                        StockBalanceRepository stockBalanceRepository,
                        AuditService auditService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.warehouseRepository = warehouseRepository;
        this.movementRepository = movementRepository;
        this.stockBalanceRepository = stockBalanceRepository;
        this.auditService = auditService;
    }

    public List<Product> listProducts() {
        return productRepository.findAll();
    }

    public Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado"));
    }

    @Transactional
    public Product createProduct(Product product, String userEmail, String userNome) {
        if (productRepository.existsByCodigo(product.getCodigo())) {
            throw new IllegalArgumentException("Já existe um produto com o código: " + product.getCodigo());
        }
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());

        BigDecimal initialQty = product.getQuantidadeAtual() != null ? product.getQuantidadeAtual() : BigDecimal.ZERO;
        product.setQuantidadeAtual(initialQty);

        Product saved = productRepository.save(product);

        // Se o produto foi criado com saldo inicial e galpão associado, inicializa o saldo físico no StockBalance
        if (saved.getGalpao() != null && saved.getGalpao().getId() != null) {
            warehouseRepository.findById(saved.getGalpao().getId()).ifPresent(wh -> {
                String lot = (saved.getLote() == null || saved.getLote().isBlank()) ? "SEM_LOTE" : saved.getLote().trim();
                String location = (saved.getLocalizacaoPrateleira() == null || saved.getLocalizacaoPrateleira().isBlank()) ? "NAO_ENDERECADO" : saved.getLocalizacaoPrateleira().trim();

                StockBalance balance = new StockBalance();
                balance.setProduto(saved);
                balance.setGalpao(wh);
                balance.setLote(lot);
                balance.setLocalizacaoPrateleira(location);
                balance.setDataValidade(saved.getDataValidade());
                balance.setQuantidadeAtual(initialQty);
                balance.setQuantidadeReservada(BigDecimal.ZERO);
                balance.setQuantidadeBloqueada(BigDecimal.ZERO);
                balance.setQuantidadeMinima(saved.getQuantidadeMinima() != null ? saved.getQuantidadeMinima() : BigDecimal.ZERO);
                balance.setStatus("DISPONIVEL");
                stockBalanceRepository.save(balance);

                if (initialQty.compareTo(BigDecimal.ZERO) > 0) {
                    InventoryMovement mov = new InventoryMovement(
                            saved,
                            OperationType.ENTRADA,
                            initialQty,
                            "Saldo Inicial de Cadastro",
                            wh.getNome(),
                            userNome != null ? userNome : userEmail,
                            "Implantação inicial de estoque",
                            "Cadastro de produto com estoque inicial"
                    );
                    mov.setSaldoDestinoId(balance.getId());
                    mov.setLote(lot);
                    mov.setLocalizacao(location);
                    mov.setComprovanteCodigo("INI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    mov.setCreatedAt(LocalDateTime.now());
                    movementRepository.save(mov);
                }
            });
        }

        auditService.log(userNome, userEmail, "ESTOQUE", "CRIACAO_PRODUTO", "Product", saved.getId().toString(),
                "Criado produto: " + saved.getNome() + " (" + saved.getCodigo() + ") com estoque inicial: " + initialQty);
        return saved;
    }

    @Transactional
    public Product updateProduct(Long id, Product details, String userEmail, String userNome) {
        Product p = getProduct(id);
        p.setNome(details.getNome());
        p.setDescricao(details.getDescricao());
        p.setUnidade(details.getUnidade());
        p.setQuantidadeMinima(details.getQuantidadeMinima());
        p.setLote(details.getLote());
        p.setDataValidade(details.getDataValidade());
        p.setPrecoUnitario(details.getPrecoUnitario());
        p.setEpi(details.isEpi());
        p.setNumeroCa(details.getNumeroCa());
        p.setLocalizacaoPrateleira(details.getLocalizacaoPrateleira());
        if (details.getCategoria() != null) p.setCategoria(details.getCategoria());
        if (details.getGalpao() != null) p.setGalpao(details.getGalpao());
        p.setUpdatedAt(LocalDateTime.now());
        Product updated = productRepository.save(p);
        auditService.log(userNome, userEmail, "ESTOQUE", "ATUALIZACAO_PRODUTO", "Product", updated.getId().toString(),
                "Atualizado produto: " + updated.getNome() + " (" + updated.getCodigo() + ")");
        return updated;
    }

    @Transactional
    public void deleteProduct(Long id, String userEmail, String userNome) {
        Product p = getProduct(id);
        productRepository.delete(p);
        auditService.log(userNome, userEmail, "ESTOQUE", "EXCLUSAO_PRODUTO", "Product", id.toString(),
                "Excluído produto: " + p.getNome() + " (" + p.getCodigo() + ")");
    }

    public List<Category> listCategories() {
        return categoryRepository.findAll();
    }

    @Transactional
    public Category createCategory(Category category, String userEmail, String userNome) {
        if (categoryRepository.existsByNome(category.getNome())) {
            throw new IllegalArgumentException("Categoria já existente: " + category.getNome());
        }
        Category saved = categoryRepository.save(category);
        auditService.log(userNome, userEmail, "ESTOQUE", "CRIACAO_CATEGORIA", "Category", saved.getId().toString(),
                "Criada categoria: " + saved.getNome());
        return saved;
    }

    public List<InventoryMovement> listMovements() {
        return movementRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional
    public InventoryMovement registerMovement(InventoryMovement movement, String userEmail, String userNome) {
        Product product = getProduct(movement.getProduto().getId());
        BigDecimal qtd = movement.getQuantidade();
        if (qtd == null || qtd.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade movimentada deve ser maior que zero.");
        }

        // Localiza ou inicializa o saldo físico do produto no galpão
        Warehouse wh = product.getGalpao() != null ? product.getGalpao() :
                warehouseRepository.findAll().stream().findFirst().orElse(null);

        StockBalance balance = null;
        if (wh != null) {
            String lot = (product.getLote() == null || product.getLote().isBlank()) ? "SEM_LOTE" : product.getLote().trim();
            String location = (product.getLocalizacaoPrateleira() == null || product.getLocalizacaoPrateleira().isBlank()) ? "NAO_ENDERECADO" : product.getLocalizacaoPrateleira().trim();
            balance = stockBalanceRepository.findByProdutoIdAndGalpaoIdAndLoteAndLocalizacaoPrateleira(product.getId(), wh.getId(), lot, location)
                    .orElseGet(() -> {
                        StockBalance b = new StockBalance();
                        b.setProduto(product);
                        b.setGalpao(wh);
                        b.setLote(lot);
                        b.setLocalizacaoPrateleira(location);
                        b.setQuantidadeMinima(product.getQuantidadeMinima());
                        return stockBalanceRepository.save(b);
                    });
        }

        BigDecimal estoqueAnterior = product.getQuantidadeAtual() != null ? product.getQuantidadeAtual() : BigDecimal.ZERO;
        BigDecimal novoEstoque = estoqueAnterior;

        switch (movement.getTipo()) {
            case ENTRADA, DEVOLUCAO -> {
                novoEstoque = estoqueAnterior.add(qtd);
                if (balance != null) {
                    balance.setQuantidadeAtual(balance.getQuantidadeAtual().add(qtd));
                }
            }
            case SAIDA, TRANSFERENCIA -> {
                if (estoqueAnterior.compareTo(qtd) < 0) {
                    throw new IllegalArgumentException("Saldo insuficiente em estoque. Disponível: " + estoqueAnterior + " " + product.getUnidade());
                }
                novoEstoque = estoqueAnterior.subtract(qtd);
                if (balance != null) {
                    if (balance.getQuantidadeDisponivel().compareTo(qtd) < 0) {
                        throw new IllegalArgumentException("Saldo disponível no almoxarifado insuficiente. Disponível: " + balance.getQuantidadeDisponivel());
                    }
                    balance.setQuantidadeAtual(balance.getQuantidadeAtual().subtract(qtd));
                }
            }
            case AJUSTE -> {
                novoEstoque = qtd;
                if (balance != null) {
                    balance.setQuantidadeAtual(qtd);
                }
            }
            default -> throw new IllegalArgumentException("Tipo de movimentação não suportado nesta operação.");
        }

        if (balance != null) {
            stockBalanceRepository.save(balance);
        }

        product.setQuantidadeAtual(novoEstoque);
        product.setUpdatedAt(LocalDateTime.now());
        productRepository.save(product);

        movement.setProduto(product);
        movement.setProdutoNome(product.getNome());
        movement.setProdutoCodigo(product.getCodigo());
        movement.setResponsavel(userNome != null ? userNome : userEmail);
        movement.setComprovanteCodigo("MOV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        movement.setCreatedAt(LocalDateTime.now());
        if (balance != null) {
            movement.setSaldoOrigemId(balance.getId());
            movement.setLote(balance.getLote());
            movement.setLocalizacao(balance.getLocalizacaoPrateleira());
        }
        InventoryMovement saved = movementRepository.save(movement);

        auditService.log(userNome, userEmail, "ESTOQUE", "MOVIMENTACAO_" + movement.getTipo().name(), "InventoryMovement",
                saved.getId().toString(), "Movimentação " + movement.getTipo() + " de " + qtd + " " + product.getUnidade() +
                        " do produto " + product.getNome() + ". Saldo alterado de " + estoqueAnterior + " para " + novoEstoque +
                        (movement.getMotivo() != null ? " | Motivo: " + movement.getMotivo() : ""));

        return saved;
    }

    public List<Product> listBaixoEstoque() {
        return productRepository.findBaixoEstoque();
    }
}
