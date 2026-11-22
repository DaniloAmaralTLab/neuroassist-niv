package com.neuroassist.acs.infrastructure.persistence.repository;

import com.neuroassist.acs.infrastructure.persistence.entity.CaregiverIdentityLookupJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaregiverIdentityLookupJpaRepository
        extends JpaRepository<CaregiverIdentityLookupJpaEntity, UUID> {

    List<CaregiverIdentityLookupJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
