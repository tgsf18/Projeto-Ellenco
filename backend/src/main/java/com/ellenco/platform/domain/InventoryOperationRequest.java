package com.ellenco.platform.domain;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record InventoryOperationRequest(
    @NotNull OperationType tipo,
    Long produtoId,
    Long saldoOrigemId,
    Long galpaoOrigemId,
    Long galpaoDestinoId,
    String lote,
    String localizacaoOrigem,
    String localizacaoDestino,
    LocalDate dataValidade,
    @NotNull @DecimalMin("0.01") BigDecimal quantidade,
    Long obraId,
    String eap,
    String frenteServico,
    String equipe,
    String responsavelOperacao,
    String motivo,
    String observacao
) {}
