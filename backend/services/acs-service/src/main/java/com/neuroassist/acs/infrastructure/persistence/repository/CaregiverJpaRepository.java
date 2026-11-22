package com.neuroassist.acs.infrastructure.persistence.repository;

import com.neuroassist.acs.infrastructure.persistence.entity.CaregiverJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaregiverJpaRepository extends JpaRepository<CaregiverJpaEntity, UUID> {

    List<CaregiverJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
