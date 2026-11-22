package com.neuroassist.hist.infrastructure.persistence.repository;

import com.neuroassist.hist.infrastructure.persistence.entity.AuditSourceJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditSourceJpaRepository extends JpaRepository<AuditSourceJpaEntity, UUID> {

    List<AuditSourceJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
