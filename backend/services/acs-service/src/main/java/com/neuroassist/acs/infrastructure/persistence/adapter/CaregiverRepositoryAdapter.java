package com.neuroassist.acs.infrastructure.persistence.adapter;

import com.neuroassist.acs.application.port.out.CaregiverRepositoryPort;
import com.neuroassist.acs.domain.model.Caregiver;
import com.neuroassist.acs.infrastructure.persistence.repository.CaregiverJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CaregiverRepositoryAdapter implements CaregiverRepositoryPort {

    private final CaregiverJpaRepository repository;

    @Override
    public Caregiver save(Caregiver entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<Caregiver> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<Caregiver> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
