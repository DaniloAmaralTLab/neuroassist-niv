package com.neuroassist.acs.infrastructure.persistence.repository;

import com.neuroassist.acs.infrastructure.persistence.entity.TenantJpaEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantJpaRepository extends JpaRepository<TenantJpaEntity, UUID> {

    // TODO[SCAFFOLD]: add domain-specific query methods
}
