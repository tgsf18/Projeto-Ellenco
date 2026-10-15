package com.ellenco.platform.domain;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class StockService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final WarehouseRepository warehouseRepository;
    private final MovementRepository movementRepository;
    private final AuditService auditService;

    public StockService(ProductRepository productRepository,
                        CategoryRepository categoryRepository,
                        WarehouseRepository warehouseRepository,
                        MovementRepository movementRepository,
                        AuditService auditService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.warehouseRepository = warehouseRepository;
        this.movementRepository = movementRepository;
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
        Product saved = productRepository.save(product);
        auditService.log(userNome, userEmail, "ESTOQUE", "CRIACAO_PRODUTO", "Product", saved.getId().toString(),
                "Criado produto: " + saved.getNome() + " (" + saved.getCodigo() + ") com estoque inicial: " + saved.getQuantidadeAtual());
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

        BigDecimal estoqueAnterior = product.getQuantidadeAtual();
        BigDecimal novoEstoque = estoqueAnterior;

        switch (movement.getTipo()) {
            case ENTRADA -> {
                novoEstoque = estoqueAnterior.add(qtd);
            }
            case SAIDA -> {
                if (estoqueAnterior.compareTo(qtd) < 0) {
                    throw new IllegalArgumentException("Saldo insuficiente em estoque. Disponível: " + estoqueAnterior + " " + product.getUnidade());
                }
                novoEstoque = estoqueAnterior.subtract(qtd);
            }
            case AJUSTE -> {
                novoEstoque = qtd;
            }
            case TRANSFERENCIA -> {
                if (estoqueAnterior.compareTo(qtd) < 0) {
                    throw new IllegalArgumentException("Saldo insuficiente para transferência. Disponível: " + estoqueAnterior);
                }
                novoEstoque = estoqueAnterior.subtract(qtd);
            }
        }

        product.setQuantidadeAtual(novoEstoque);
        product.setUpdatedAt(LocalDateTime.now());
        productRepository.save(product);

        movement.setProduto(product);
        movement.setProdutoNome(product.getNome());
        movement.setProdutoCodigo(product.getCodigo());
        movement.setResponsavel(userNome != null ? userNome : userEmail);
        movement.setCreatedAt(LocalDateTime.now());
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
