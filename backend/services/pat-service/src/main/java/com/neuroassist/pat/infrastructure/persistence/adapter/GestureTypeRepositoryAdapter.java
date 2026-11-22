package com.neuroassist.pat.infrastructure.persistence.adapter;

import com.neuroassist.pat.application.port.out.GestureTypeRepositoryPort;
import com.neuroassist.pat.domain.model.GestureType;
import com.neuroassist.pat.infrastructure.persistence.repository.GestureTypeJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GestureTypeRepositoryAdapter implements GestureTypeRepositoryPort {

    private final GestureTypeJpaRepository repository;

    @Override
    public GestureType save(GestureType entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<GestureType> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<GestureType> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
