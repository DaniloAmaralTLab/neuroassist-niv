package com.neuroassist.acs.infrastructure.persistence.adapter;

import com.neuroassist.acs.application.port.out.CaregiverIdentityLookupRepositoryPort;
import com.neuroassist.acs.domain.model.CaregiverIdentityLookup;
import com.neuroassist.acs.infrastructure.persistence.repository.CaregiverIdentityLookupJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CaregiverIdentityLookupRepositoryAdapter
        implements CaregiverIdentityLookupRepositoryPort {

    private final CaregiverIdentityLookupJpaRepository repository;

    @Override
    public CaregiverIdentityLookup save(CaregiverIdentityLookup entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<CaregiverIdentityLookup> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<CaregiverIdentityLookup> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
