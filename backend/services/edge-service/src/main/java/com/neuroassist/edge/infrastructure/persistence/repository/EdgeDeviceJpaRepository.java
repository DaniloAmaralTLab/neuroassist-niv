package com.neuroassist.edge.infrastructure.persistence.repository;

import com.neuroassist.edge.infrastructure.persistence.entity.EdgeDeviceJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EdgeDeviceJpaRepository extends JpaRepository<EdgeDeviceJpaEntity, UUID> {

    List<EdgeDeviceJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
