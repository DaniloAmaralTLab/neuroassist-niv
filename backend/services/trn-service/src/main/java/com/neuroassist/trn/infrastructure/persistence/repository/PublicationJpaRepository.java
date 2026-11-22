package com.neuroassist.trn.infrastructure.persistence.repository;

import com.neuroassist.trn.infrastructure.persistence.entity.PublicationJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicationJpaRepository extends JpaRepository<PublicationJpaEntity, UUID> {

    List<PublicationJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
