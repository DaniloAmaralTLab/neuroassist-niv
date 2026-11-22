package com.neuroassist.evnt.infrastructure.persistence.adapter;

import com.neuroassist.evnt.application.port.out.EscalationAttemptRepositoryPort;
import com.neuroassist.evnt.domain.model.EscalationAttempt;
import com.neuroassist.evnt.infrastructure.persistence.repository.EscalationAttemptJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EscalationAttemptRepositoryAdapter implements EscalationAttemptRepositoryPort {

    private final EscalationAttemptJpaRepository repository;

    @Override
    public EscalationAttempt save(EscalationAttempt entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<EscalationAttempt> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<EscalationAttempt> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
