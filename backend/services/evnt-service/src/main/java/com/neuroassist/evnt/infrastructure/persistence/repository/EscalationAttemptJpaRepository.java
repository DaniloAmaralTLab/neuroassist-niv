package com.neuroassist.evnt.infrastructure.persistence.repository;

import com.neuroassist.evnt.infrastructure.persistence.entity.EscalationAttemptJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EscalationAttemptJpaRepository
        extends JpaRepository<EscalationAttemptJpaEntity, UUID> {

    List<EscalationAttemptJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
