package com.neuroassist.conv.infrastructure.persistence.repository;

import com.neuroassist.conv.infrastructure.persistence.entity.TreeVersionJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TreeVersionJpaRepository extends JpaRepository<TreeVersionJpaEntity, UUID> {

    List<TreeVersionJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
