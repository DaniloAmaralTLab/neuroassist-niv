package com.neuroassist.evnt.infrastructure.persistence.repository;

import com.neuroassist.evnt.infrastructure.persistence.entity.EventJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventJpaRepository extends JpaRepository<EventJpaEntity, UUID> {

    List<EventJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
