package com.neuroassist.pat.infrastructure.persistence.repository;

import com.neuroassist.pat.infrastructure.persistence.entity.GestureTypeJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GestureTypeJpaRepository extends JpaRepository<GestureTypeJpaEntity, UUID> {

    List<GestureTypeJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
