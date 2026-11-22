package com.neuroassist.conv.infrastructure.persistence.repository;

import com.neuroassist.conv.infrastructure.persistence.entity.PhraseJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhraseJpaRepository extends JpaRepository<PhraseJpaEntity, UUID> {

    List<PhraseJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
