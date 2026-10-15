package com.ellenco.platform.config;

import com.ellenco.platform.auth.Role;
import com.ellenco.platform.auth.User;
import com.ellenco.platform.auth.UserRepository;
import com.ellenco.platform.domain.Category;
import com.ellenco.platform.domain.CategoryRepository;
import com.ellenco.platform.domain.Product;
import com.ellenco.platform.domain.ProductRepository;
import com.ellenco.platform.domain.ConstructionSite;
import com.ellenco.platform.domain.ConstructionSiteRepository;
import com.ellenco.platform.domain.Warehouse;
import com.ellenco.platform.domain.WarehouseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;

@Configuration
public class InitialDataConfig {
    @Bean
    @ConditionalOnProperty(name = "ellenco.bootstrap.enabled", havingValue = "true", matchIfMissing = false)
    CommandLineRunner initialData(UserRepository users, CategoryRepository categories, ProductRepository products, ConstructionSiteRepository sites, WarehouseRepository warehouses, PasswordEncoder encoder,
                                  @Value("${ellenco.bootstrap.password:Ellenco@123}") String bootstrapPassword) {
        return args -> {
            createUser(users, encoder, "Administrador", "admin@ellenco.com", Role.ADMIN, bootstrapPassword, "10000010081");
            createUser(users, encoder, "Supervisora Operacional", "supervisor@ellenco.com", Role.SUPERVISOR, bootstrapPassword, "10000010162");
            createUser(users, encoder, "Funcionário", "funcionario@ellenco.com", Role.FUNCIONARIO, bootstrapPassword, "10000010243");
            if (sites.count() == 0) {
                ConstructionSite site = new ConstructionSite(); site.setCodigo("OBRA-001"); site.setNome("Obra Piloto"); site.setResponsavel("Supervisor operacional"); site.setStatus("ATIVA"); sites.save(site);
                Warehouse warehouse = new Warehouse(); warehouse.setCodigo("GALPAO-001"); warehouse.setNome("Almoxarifado da Obra Piloto"); warehouse.setResponsavel("Almoxarifado"); warehouse.setStatus("ATIVO"); warehouse.setObra(site); warehouses.save(warehouse);
            }
            if (categories.count() == 0) {
                Category epi = categories.save(category("EPI", "Equipamentos de proteção individual"));
                Category material = categories.save(category("Materiais", "Materiais operacionais"));
                products.save(new Product("EPI-001", "Capacete de segurança", epi, null, "UN", new BigDecimal("4"), new BigDecimal("10"), true, "CA 498"));
                products.save(new Product("EPI-002", "Luva de proteção", epi, null, "PAR", new BigDecimal("18"), new BigDecimal("10"), true, "CA 16312"));
                products.save(new Product("MAT-001", "Cabo elétrico", material, null, "M", new BigDecimal("7"), new BigDecimal("15"), false, null));
            }
        };
    }
    private void createUser(UserRepository users, PasswordEncoder encoder, String name, String email, Role role, String password, String cpf) {
        if (!users.existsByEmail(email)) {
            User user = new User(name, email, encoder.encode(password), role);
            user.setCpf(cpf);
            users.save(user);
        }
    }
    private Category category(String name, String description) {
        Category category = new Category();
        category.setNome(name);
        category.setDescricao(description);
        return category;
    }
}
