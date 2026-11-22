package com.neuroassist.trn.infrastructure.persistence.adapter;

import com.neuroassist.trn.application.port.out.AuthorizationRepositoryPort;
import com.neuroassist.trn.domain.model.Authorization;
import com.neuroassist.trn.infrastructure.persistence.repository.AuthorizationJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthorizationRepositoryAdapter implements AuthorizationRepositoryPort {

    private final AuthorizationJpaRepository repository;

    @Override
    public Authorization save(Authorization entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<Authorization> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<Authorization> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
