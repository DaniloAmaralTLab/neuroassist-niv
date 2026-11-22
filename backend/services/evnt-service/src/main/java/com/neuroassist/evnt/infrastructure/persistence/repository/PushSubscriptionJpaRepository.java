package com.neuroassist.evnt.infrastructure.persistence.repository;

import com.neuroassist.evnt.infrastructure.persistence.entity.PushSubscriptionJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionJpaRepository
        extends JpaRepository<PushSubscriptionJpaEntity, UUID> {

    List<PushSubscriptionJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
