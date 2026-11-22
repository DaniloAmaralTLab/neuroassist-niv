package com.neuroassist.hist.infrastructure.persistence.adapter;

import com.neuroassist.hist.application.port.out.AuditSourceRepositoryPort;
import com.neuroassist.hist.domain.model.AuditSource;
import com.neuroassist.hist.infrastructure.persistence.repository.AuditSourceJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuditSourceRepositoryAdapter implements AuditSourceRepositoryPort {

    private final AuditSourceJpaRepository repository;

    @Override
    public AuditSource save(AuditSource entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<AuditSource> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<AuditSource> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
