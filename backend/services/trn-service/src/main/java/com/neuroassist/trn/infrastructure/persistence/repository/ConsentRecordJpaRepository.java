package com.neuroassist.trn.infrastructure.persistence.repository;

import com.neuroassist.trn.infrastructure.persistence.entity.ConsentRecordJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsentRecordJpaRepository extends JpaRepository<ConsentRecordJpaEntity, UUID> {

    List<ConsentRecordJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
