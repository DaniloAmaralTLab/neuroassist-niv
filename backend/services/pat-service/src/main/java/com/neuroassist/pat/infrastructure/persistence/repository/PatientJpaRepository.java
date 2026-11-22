package com.neuroassist.pat.infrastructure.persistence.repository;

import com.neuroassist.pat.infrastructure.persistence.entity.PatientJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientJpaRepository extends JpaRepository<PatientJpaEntity, UUID> {

    List<PatientJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
