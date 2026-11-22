package com.neuroassist.gest.infrastructure.persistence.repository;

import com.neuroassist.gest.infrastructure.persistence.entity.EngineVersionJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EngineVersionJpaRepository extends JpaRepository<EngineVersionJpaEntity, UUID> {

    List<EngineVersionJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
