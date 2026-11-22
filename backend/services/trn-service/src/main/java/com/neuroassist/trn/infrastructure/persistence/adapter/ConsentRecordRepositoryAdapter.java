package com.neuroassist.trn.infrastructure.persistence.adapter;

import com.neuroassist.trn.application.port.out.ConsentRecordRepositoryPort;
import com.neuroassist.trn.domain.model.ConsentRecord;
import com.neuroassist.trn.infrastructure.persistence.repository.ConsentRecordJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ConsentRecordRepositoryAdapter implements ConsentRecordRepositoryPort {

    private final ConsentRecordJpaRepository repository;

    @Override
    public ConsentRecord save(ConsentRecord entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<ConsentRecord> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<ConsentRecord> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
