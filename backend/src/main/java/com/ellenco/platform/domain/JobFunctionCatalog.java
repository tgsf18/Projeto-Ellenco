package com.ellenco.platform.domain;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

public final class JobFunctionCatalog {
    private static final List<String> FUNCTIONS = List.of(
            "Operário", "Operador", "Almoxarife", "Recursos Humanos", "Técnico de Segurança",
            "Engenheiro", "Supervisor", "Diretor", "Administrativo", "Compras", "Financeiro",
            "Segurança do Trabalho"
    );

    private JobFunctionCatalog() {}

    public static List<String> all() { return FUNCTIONS; }

    public static String canonicalize(String value) {
        if (value == null || value.isBlank()) return "Operário";
        String requested = normalize(value);
        return FUNCTIONS.stream().filter(item -> normalize(item).equals(requested)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Selecione um cargo disponível na lista de funções."));
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
}
