package com.neuroassist.gest.infrastructure.persistence.adapter;

import com.neuroassist.gest.application.port.out.EngineCapabilityRepositoryPort;
import com.neuroassist.gest.domain.model.EngineCapability;
import com.neuroassist.gest.infrastructure.persistence.repository.EngineCapabilityJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EngineCapabilityRepositoryAdapter implements EngineCapabilityRepositoryPort {

    private final EngineCapabilityJpaRepository repository;

    @Override
    public EngineCapability save(EngineCapability entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<EngineCapability> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<EngineCapability> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
