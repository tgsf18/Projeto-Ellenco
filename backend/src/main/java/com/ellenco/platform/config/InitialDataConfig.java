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
                                  @Value("${ellenco.bootstrap.admin-email:}") String adminEmail,
                                  @Value("${ellenco.bootstrap.admin-password:}") String adminPassword,
                                  @Value("${ellenco.bootstrap.reset-existing-admin:false}") boolean resetExistingAdminPassword) {
        return args -> {
            if (adminEmail.isBlank() || adminPassword.length() < 12) {
                throw new IllegalStateException("Bootstrap requer ellenco.bootstrap.admin-email e senha com pelo menos 12 caracteres.");
            }
            createUser(users, encoder, "Administrador", adminEmail.trim().toLowerCase(), Role.ADMIN, adminPassword, "10000010081", resetExistingAdminPassword);
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
    private void createUser(UserRepository users, PasswordEncoder encoder, String name, String email, Role role, String password, String cpf, boolean resetExistingAdminPassword) {
        User existing = users.findByEmail(email).orElse(null);
        if (existing != null) {
            if (existing.getRole() != role) {
                throw new IllegalStateException("O e-mail de bootstrap já está cadastrado com outro perfil. Use um e-mail ainda não cadastrado para o primeiro administrador.");
            }
            if (role == Role.ADMIN && resetExistingAdminPassword) {
                existing.setPassword(encoder.encode(password));
                users.save(existing);
            }
            return;
        }
        User user = new User(name, email, encoder.encode(password), role);
        user.setCpf(cpf);
        users.save(user);
    }
    private Category category(String name, String description) {
        Category category = new Category();
        category.setNome(name);
        category.setDescricao(description);
        return category;
    }
}
