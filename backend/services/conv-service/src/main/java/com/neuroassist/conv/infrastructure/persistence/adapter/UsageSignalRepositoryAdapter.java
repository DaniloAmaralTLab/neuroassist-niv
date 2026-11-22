package com.neuroassist.conv.infrastructure.persistence.adapter;

import com.neuroassist.conv.application.port.out.UsageSignalRepositoryPort;
import com.neuroassist.conv.domain.model.UsageSignal;
import com.neuroassist.conv.infrastructure.persistence.repository.UsageSignalJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UsageSignalRepositoryAdapter implements UsageSignalRepositoryPort {

    private final UsageSignalJpaRepository repository;

    @Override
    public UsageSignal save(UsageSignal entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<UsageSignal> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<UsageSignal> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
