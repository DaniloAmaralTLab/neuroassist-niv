package com.neuroassist.edge.infrastructure.persistence.repository;

import com.neuroassist.edge.infrastructure.persistence.entity.EdgeCredentialRevocationJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EdgeCredentialRevocationJpaRepository
        extends JpaRepository<EdgeCredentialRevocationJpaEntity, UUID> {

    List<EdgeCredentialRevocationJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
