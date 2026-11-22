package com.neuroassist.edge.infrastructure.persistence.repository;

import com.neuroassist.edge.infrastructure.persistence.entity.CachedCatalogJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CachedCatalogJpaRepository extends JpaRepository<CachedCatalogJpaEntity, UUID> {

    List<CachedCatalogJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
