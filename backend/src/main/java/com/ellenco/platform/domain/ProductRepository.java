package com.ellenco.platform.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByCodigo(String codigo);
    boolean existsByCodigo(String codigo);
    List<Product> findByIsEpi(boolean isEpi);
    List<Product> findByCategoriaId(Long categoriaId);
    List<Product> findByGalpaoId(Long galpaoId);

    @Query("SELECT p FROM Product p WHERE p.quantidadeAtual <= p.quantidadeMinima")
    List<Product> findBaixoEstoque();

    @Query("SELECT COUNT(p) FROM Product p WHERE p.quantidadeAtual <= p.quantidadeMinima")
    long countBaixoEstoque();
}
