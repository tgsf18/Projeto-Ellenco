package com.ellenco.platform.controllers;

import com.ellenco.platform.domain.ToolAsset;
import com.ellenco.platform.domain.ToolAssetRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tools/qr")
public class ToolQrController {

    private final ToolAssetRepository tools;

    public ToolQrController(ToolAssetRepository tools) {
        this.tools = tools;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('GLOBAL_ADMIN','CEO','ADMIN','SUPERVISOR','FUNCIONARIO')")
    public ToolQrDetails get(@PathVariable Long id) {
        ToolAsset tool = tools.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ferramenta não encontrada."));
        String warehouse = tool.getGalpao() != null ? tool.getGalpao().getNome() : null;
        String site = tool.getGalpao() != null && tool.getGalpao().getObra() != null
                ? tool.getGalpao().getObra().getNome() : null;
        return new ToolQrDetails(tool.getId(), tool.getPatrimonio(), tool.getNome(), tool.getCategoria(),
                tool.getMarca(), tool.getModelo(), tool.getEstadoConservacao(), tool.getStatus(),
                tool.getLocalizacao(), warehouse, site);
    }

    public record ToolQrDetails(Long id, String patrimonio, String nome, String categoria,
                                String marca, String modelo, String estadoConservacao,
                                String status, String localizacao, String galpao, String obra) {}
}
