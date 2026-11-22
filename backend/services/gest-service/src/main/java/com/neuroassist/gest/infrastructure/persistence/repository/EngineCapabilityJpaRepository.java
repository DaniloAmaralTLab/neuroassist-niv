package com.neuroassist.gest.infrastructure.persistence.repository;

import com.neuroassist.gest.infrastructure.persistence.entity.EngineCapabilityJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EngineCapabilityJpaRepository
        extends JpaRepository<EngineCapabilityJpaEntity, UUID> {

    List<EngineCapabilityJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
