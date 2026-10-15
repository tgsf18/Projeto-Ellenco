package com.ellenco.platform.domain;

import com.ellenco.platform.auth.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class InventoryOperationService {
    private final StockBalanceRepository balances; private final ProductRepository products; private final WarehouseRepository warehouses; private final MovementRepository movements; private final AuditService audit;
    public InventoryOperationService(StockBalanceRepository b,ProductRepository p,WarehouseRepository w,MovementRepository m,AuditService a){balances=b;products=p;warehouses=w;movements=m;audit=a;}

    @Transactional
    public InventoryMovement execute(InventoryOperationRequest r, User user){
        if(r.quantidade()==null||r.quantidade().signum()<=0)throw new IllegalArgumentException("A quantidade deve ser maior que zero.");
        StockBalance origin = requiresOrigin(r.tipo()) ? resolveOrigin(r) : null;
        Product product = origin!=null?origin.getProduto():products.findById(required(r.produtoId(),"Informe o produto.")).orElseThrow(()->new IllegalArgumentException("Produto não encontrado."));
        StockBalance destination = null;
        switch(r.tipo()){
            case SAIDA -> debit(origin,r.quantidade());
            case TRANSFERENCIA -> { debit(origin,r.quantidade()); destination=destination(product,r); credit(destination,r.quantidade()); }
            case ENTRADA,DEVOLUCAO -> { destination=destination(product,r); credit(destination,r.quantidade()); }
            case RESERVA -> { ensureAvailable(origin,r.quantidade()); origin.setQuantidadeReservada(origin.getQuantidadeReservada().add(r.quantidade())); }
            case LIBERACAO -> { if(origin.getQuantidadeReservada().compareTo(r.quantidade())<0)throw new IllegalArgumentException("A liberação é maior que a quantidade reservada.");origin.setQuantidadeReservada(origin.getQuantidadeReservada().subtract(r.quantidade())); }
            case BLOQUEIO -> { ensureAvailable(origin,r.quantidade());origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().add(r.quantidade()));origin.setStatus("BLOQUEADO_PARCIAL"); }
            case DESBLOQUEIO -> { if(origin.getQuantidadeBloqueada().compareTo(r.quantidade())<0)throw new IllegalArgumentException("O desbloqueio é maior que a quantidade bloqueada.");origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().subtract(r.quantidade()));origin.setStatus(origin.getQuantidadeBloqueada().signum()==0?"DISPONIVEL":"BLOQUEADO_PARCIAL"); }
            case AJUSTE -> origin.setQuantidadeAtual(r.quantidade());
            default -> throw new IllegalArgumentException("Operação não permitida neste fluxo.");
        }
        if(origin!=null)balances.save(origin); if(destination!=null)balances.save(destination);
        refreshProduct(product);
        InventoryMovement movement=new InventoryMovement(product,r.tipo(),r.quantidade(),origin==null?null:origin.getGalpao().getNome(),destination==null?null:destination.getGalpao().getNome(),r.responsavelOperacao()==null||r.responsavelOperacao().isBlank()?user.getNome():r.responsavelOperacao(),r.motivo(),r.observacao());
        movement.setSaldoOrigemId(origin==null?null:origin.getId());movement.setSaldoDestinoId(destination==null?null:destination.getId());movement.setLote(origin!=null?origin.getLote():destination.getLote());movement.setLocalizacao(origin!=null?origin.getLocalizacaoPrateleira():destination.getLocalizacaoPrateleira());movement.setObraId(r.obraId());movement.setEap(r.eap());movement.setFrenteServico(r.frenteServico());movement.setEquipe(r.equipe());movement.setComprovanteCodigo("MOV-"+UUID.randomUUID().toString().substring(0,8).toUpperCase());movement.setCreatedAt(LocalDateTime.now());
        InventoryMovement saved=movements.save(movement);audit.log(user.getNome(),user.getEmail(),"ESTOQUE","MOVIMENTACAO_"+r.tipo(),"InventoryMovement",saved.getId().toString(),"Comprovante "+saved.getComprovanteCodigo()+" | "+r.quantidade()+" "+product.getUnidade()+" | "+product.getNome());return saved;
    }

    @Transactional
    public InventoryMovement reverse(Long id,String reason,User user){InventoryMovement original=movements.findById(id).orElseThrow(()->new IllegalArgumentException("Movimentação não encontrada."));if(original.isEstornado())throw new IllegalArgumentException("Esta movimentação já foi estornada.");if(reason==null||reason.isBlank())throw new IllegalArgumentException("Informe o motivo do estorno.");StockBalance origin=original.getSaldoOrigemId()==null?null:balances.findById(original.getSaldoOrigemId()).orElse(null);StockBalance destination=original.getSaldoDestinoId()==null?null:balances.findById(original.getSaldoDestinoId()).orElse(null);switch(original.getTipo()){case SAIDA->{credit(origin,original.getQuantidade());}case ENTRADA,DEVOLUCAO->{debit(destination,original.getQuantidade());}case TRANSFERENCIA->{debit(destination,original.getQuantidade());credit(origin,original.getQuantidade());}case RESERVA->{origin.setQuantidadeReservada(origin.getQuantidadeReservada().subtract(original.getQuantidade()));balances.save(origin);}case LIBERACAO->{origin.setQuantidadeReservada(origin.getQuantidadeReservada().add(original.getQuantidade()));balances.save(origin);}case BLOQUEIO->{origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().subtract(original.getQuantidade()));balances.save(origin);}case DESBLOQUEIO->{origin.setQuantidadeBloqueada(origin.getQuantidadeBloqueada().add(original.getQuantidade()));balances.save(origin);}default->throw new IllegalArgumentException("O estorno desta operação exige ajuste manual aprovado.");}original.setEstornado(true);movements.save(original);InventoryMovement reversal=new InventoryMovement(original.getProduto(),OperationType.ESTORNO,original.getQuantidade(),original.getDestino(),original.getOrigem(),user.getNome(),reason,"Estorno de "+original.getComprovanteCodigo());reversal.setMovimentoOrigemId(original.getId());reversal.setComprovanteCodigo("EST-"+UUID.randomUUID().toString().substring(0,8).toUpperCase());reversal.setCreatedAt(LocalDateTime.now());refreshProduct(original.getProduto());return movements.save(reversal);}

    private StockBalance resolveOrigin(InventoryOperationRequest r){if(r.saldoOrigemId()!=null)return balances.findById(r.saldoOrigemId()).orElseThrow(()->new IllegalArgumentException("Saldo de origem não encontrado."));if(r.produtoId()==null||r.galpaoOrigemId()==null)throw new IllegalArgumentException("Informe produto e almoxarifado de origem.");return balances.findByProdutoIdOrderByDataValidadeAsc(r.produtoId()).stream().filter(b->b.getGalpao().getId().equals(r.galpaoOrigemId())&&b.getQuantidadeDisponivel().signum()>0&&!"BLOQUEADO".equals(b.getStatus())&&(b.getDataValidade()==null||!b.getDataValidade().isBefore(LocalDate.now()))).min(Comparator.comparing(b->b.getDataValidade()==null?LocalDate.MAX:b.getDataValidade())).orElseThrow(()->new IllegalArgumentException("Não existe lote disponível para a operação."));}
    private StockBalance destination(Product p,InventoryOperationRequest r){Long warehouseId=required(r.galpaoDestinoId(),"Informe o almoxarifado de destino.");Warehouse w=warehouses.findById(warehouseId).orElseThrow(()->new IllegalArgumentException("Almoxarifado de destino não encontrado."));String lot=blank(r.lote())?"SEM_LOTE":r.lote();String location=blank(r.localizacaoDestino())?"NAO_ENDERECADO":r.localizacaoDestino();return balances.findByProdutoIdAndGalpaoIdAndLoteAndLocalizacaoPrateleira(p.getId(),warehouseId,lot,location).orElseGet(()->{StockBalance b=new StockBalance();b.setProduto(p);b.setGalpao(w);b.setLote(lot);b.setLocalizacaoPrateleira(location);b.setDataValidade(r.dataValidade());b.setQuantidadeMinima(p.getQuantidadeMinima());return balances.save(b);});}
    private void debit(StockBalance b,BigDecimal q){if(b==null)throw new IllegalArgumentException("Saldo de origem obrigatório.");ensureAvailable(b,q);b.setQuantidadeAtual(b.getQuantidadeAtual().subtract(q));balances.save(b);}private void credit(StockBalance b,BigDecimal q){if(b==null)throw new IllegalArgumentException("Saldo de destino obrigatório.");b.setQuantidadeAtual(b.getQuantidadeAtual().add(q));balances.save(b);}private void ensureAvailable(StockBalance b,BigDecimal q){if(b.getDataValidade()!=null&&b.getDataValidade().isBefore(LocalDate.now()))throw new IllegalArgumentException("Lote vencido. A movimentação foi bloqueada.");if("BLOQUEADO".equals(b.getStatus()))throw new IllegalArgumentException("Lote bloqueado.");if(b.getQuantidadeDisponivel().compareTo(q)<0)throw new IllegalArgumentException("Saldo disponível insuficiente. Disponível: "+b.getQuantidadeDisponivel());}private boolean requiresOrigin(OperationType t){return List.of(OperationType.SAIDA,OperationType.TRANSFERENCIA,OperationType.RESERVA,OperationType.LIBERACAO,OperationType.BLOQUEIO,OperationType.DESBLOQUEIO,OperationType.AJUSTE).contains(t);}private void refreshProduct(Product p){BigDecimal total=balances.findByProdutoIdOrderByDataValidadeAsc(p.getId()).stream().map(StockBalance::getQuantidadeAtual).reduce(BigDecimal.ZERO,BigDecimal::add);p.setQuantidadeAtual(total);p.setUpdatedAt(LocalDateTime.now());products.save(p);}private Long required(Long v,String message){if(v==null)throw new IllegalArgumentException(message);return v;}private boolean blank(String v){return v==null||v.isBlank();}
}
