package com.neuroassist.evnt.domain.model;

import java.time.Instant;
import java.util.UUID;

// TODO[SCAFFOLD]: complete fields from domain-model-diagram.puml — no Spring/JPA imports (RULE-01,
// RULE-02)
public record Event(UUID id, String tenantId, Instant createdAt
        // TODO[SCAFFOLD]: add domain fields
        ) {}
