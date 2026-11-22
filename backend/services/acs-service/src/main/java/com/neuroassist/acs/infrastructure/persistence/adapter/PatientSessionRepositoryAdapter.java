package com.neuroassist.acs.infrastructure.persistence.adapter;

import com.neuroassist.acs.application.port.out.PatientSessionRepositoryPort;
import com.neuroassist.acs.domain.model.PatientSession;
import com.neuroassist.acs.infrastructure.persistence.repository.PatientSessionJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PatientSessionRepositoryAdapter implements PatientSessionRepositoryPort {

    private final PatientSessionJpaRepository repository;

    @Override
    public PatientSession save(PatientSession entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<PatientSession> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<PatientSession> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
