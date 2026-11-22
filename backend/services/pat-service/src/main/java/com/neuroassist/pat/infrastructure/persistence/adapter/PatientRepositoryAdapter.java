package com.neuroassist.pat.infrastructure.persistence.adapter;

import com.neuroassist.pat.application.port.out.PatientRepositoryPort;
import com.neuroassist.pat.domain.model.Patient;
import com.neuroassist.pat.infrastructure.persistence.repository.PatientJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PatientRepositoryAdapter implements PatientRepositoryPort {

    private final PatientJpaRepository repository;

    @Override
    public Patient save(Patient entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<Patient> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<Patient> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
