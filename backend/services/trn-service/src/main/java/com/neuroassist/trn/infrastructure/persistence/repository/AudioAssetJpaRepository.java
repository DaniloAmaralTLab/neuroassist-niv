package com.neuroassist.trn.infrastructure.persistence.repository;

import com.neuroassist.trn.infrastructure.persistence.entity.AudioAssetJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AudioAssetJpaRepository extends JpaRepository<AudioAssetJpaEntity, UUID> {

    List<AudioAssetJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
