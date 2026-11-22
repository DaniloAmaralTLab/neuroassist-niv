package com.neuroassist.acs.infrastructure.persistence.repository;

import com.neuroassist.acs.infrastructure.persistence.entity.PatientSessionJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientSessionJpaRepository extends JpaRepository<PatientSessionJpaEntity, UUID> {

    List<PatientSessionJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
