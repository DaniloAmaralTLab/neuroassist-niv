package com.neuroassist.pat.infrastructure.persistence.repository;

import com.neuroassist.pat.infrastructure.persistence.entity.CommandJpaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommandJpaRepository extends JpaRepository<CommandJpaEntity, UUID> {

    List<CommandJpaEntity> findByTenantId(String tenantId);

    // TODO[SCAFFOLD]: add domain-specific query methods
}
