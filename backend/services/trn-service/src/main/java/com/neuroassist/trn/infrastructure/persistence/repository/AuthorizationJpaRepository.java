package com.neuroassist.trn.infrastructure.persistence.repository;

import com.neuroassist.trn.infrastructure.persistence.entity.AuthorizationJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorizationJpaRepository extends JpaRepository<AuthorizationJpaEntity, UUID> {

    List<AuthorizationJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
