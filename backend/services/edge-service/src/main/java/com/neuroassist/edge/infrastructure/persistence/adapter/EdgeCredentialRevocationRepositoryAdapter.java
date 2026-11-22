package com.neuroassist.edge.infrastructure.persistence.adapter;

import com.neuroassist.edge.application.port.out.EdgeCredentialRevocationRepositoryPort;
import com.neuroassist.edge.domain.model.EdgeCredentialRevocation;
import com.neuroassist.edge.infrastructure.persistence.repository.EdgeCredentialRevocationJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EdgeCredentialRevocationRepositoryAdapter
        implements EdgeCredentialRevocationRepositoryPort {

    private final EdgeCredentialRevocationJpaRepository repository;

    @Override
    public EdgeCredentialRevocation save(EdgeCredentialRevocation entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<EdgeCredentialRevocation> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<EdgeCredentialRevocation> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
