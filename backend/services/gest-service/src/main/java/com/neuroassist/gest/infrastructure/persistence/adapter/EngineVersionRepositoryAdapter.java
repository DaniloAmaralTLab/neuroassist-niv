package com.neuroassist.gest.infrastructure.persistence.adapter;

import com.neuroassist.gest.application.port.out.EngineVersionRepositoryPort;
import com.neuroassist.gest.domain.model.EngineVersion;
import com.neuroassist.gest.infrastructure.persistence.repository.EngineVersionJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EngineVersionRepositoryAdapter implements EngineVersionRepositoryPort {

    private final EngineVersionJpaRepository repository;

    @Override
    public EngineVersion save(EngineVersion entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<EngineVersion> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<EngineVersion> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
