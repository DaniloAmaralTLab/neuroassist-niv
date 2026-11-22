package com.neuroassist.conv.infrastructure.persistence.adapter;

import com.neuroassist.conv.application.port.out.PublishedTreeRepositoryPort;
import com.neuroassist.conv.domain.model.PublishedTree;
import com.neuroassist.conv.infrastructure.persistence.repository.PublishedTreeJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PublishedTreeRepositoryAdapter implements PublishedTreeRepositoryPort {

    private final PublishedTreeJpaRepository repository;

    @Override
    public PublishedTree save(PublishedTree entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<PublishedTree> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<PublishedTree> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
