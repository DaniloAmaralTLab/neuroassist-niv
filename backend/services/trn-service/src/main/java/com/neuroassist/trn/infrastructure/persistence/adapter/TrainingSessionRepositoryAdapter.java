package com.neuroassist.trn.infrastructure.persistence.adapter;

import com.neuroassist.trn.application.port.out.TrainingSessionRepositoryPort;
import com.neuroassist.trn.domain.model.TrainingSession;
import com.neuroassist.trn.infrastructure.persistence.repository.TrainingSessionJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TrainingSessionRepositoryAdapter implements TrainingSessionRepositoryPort {

    private final TrainingSessionJpaRepository repository;

    @Override
    public TrainingSession save(TrainingSession entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<TrainingSession> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<TrainingSession> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
