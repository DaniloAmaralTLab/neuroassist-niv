package com.neuroassist.edge.infrastructure.persistence.repository;

import com.neuroassist.edge.infrastructure.persistence.entity.DevicePairingCodeJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DevicePairingCodeJpaRepository
        extends JpaRepository<DevicePairingCodeJpaEntity, UUID> {

    List<DevicePairingCodeJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
