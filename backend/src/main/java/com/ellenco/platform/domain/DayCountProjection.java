package com.ellenco.platform.domain;

import java.time.LocalDate;

public interface DayCountProjection {
    LocalDate getDay();
    Long getCount();
}
