package com.neuroassist.acs.infrastructure.persistence.repository;

import com.neuroassist.acs.infrastructure.persistence.entity.JwtBlacklistJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JwtBlacklistJpaRepository extends JpaRepository<JwtBlacklistJpaEntity, UUID> {

    List<JwtBlacklistJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
