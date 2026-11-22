package com.neuroassist.trn.infrastructure.persistence.repository;

import com.neuroassist.trn.infrastructure.persistence.entity.VoiceSampleJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoiceSampleJpaRepository extends JpaRepository<VoiceSampleJpaEntity, UUID> {

    List<VoiceSampleJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
