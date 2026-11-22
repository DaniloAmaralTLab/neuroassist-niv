package com.neuroassist.edge.infrastructure.persistence.adapter;

import com.neuroassist.edge.application.port.out.CachedCatalogRepositoryPort;
import com.neuroassist.edge.domain.model.CachedCatalog;
import com.neuroassist.edge.infrastructure.persistence.repository.CachedCatalogJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CachedCatalogRepositoryAdapter implements CachedCatalogRepositoryPort {

    private final CachedCatalogJpaRepository repository;

    @Override
    public CachedCatalog save(CachedCatalog entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<CachedCatalog> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<CachedCatalog> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
