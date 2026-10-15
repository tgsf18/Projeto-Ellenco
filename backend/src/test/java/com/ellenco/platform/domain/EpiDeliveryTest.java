package com.ellenco.platform.domain;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class EpiDeliveryTest {
    @Test void identificaEpiVencido() {
        EpiDelivery delivery = new EpiDelivery();
        delivery.setStatus("ENTREGUE");
        delivery.setDataPrevisaoTroca(LocalDate.now().minusDays(1));
        assertTrue(delivery.isVencido());
        assertFalse(delivery.isProximoVencimento());
    }

    @Test void identificaEpiProximoDaTroca() {
        EpiDelivery delivery = new EpiDelivery();
        delivery.setStatus("ENTREGUE");
        delivery.setDataPrevisaoTroca(LocalDate.now().plusDays(15));
        assertFalse(delivery.isVencido());
        assertTrue(delivery.isProximoVencimento());
    }

    @Test void epiSubstituidoNaoGeraAlerta() {
        EpiDelivery delivery = new EpiDelivery();
        delivery.setStatus("SUBSTITUIDO");
        delivery.setDataPrevisaoTroca(LocalDate.now().minusDays(1));
        assertFalse(delivery.isVencido());
        assertFalse(delivery.isProximoVencimento());
    }
}
