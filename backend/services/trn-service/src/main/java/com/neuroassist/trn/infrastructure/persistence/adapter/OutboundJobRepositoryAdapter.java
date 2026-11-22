package com.neuroassist.trn.infrastructure.persistence.adapter;

import com.neuroassist.trn.application.port.out.OutboundJobRepositoryPort;
import com.neuroassist.trn.domain.model.OutboundJob;
import com.neuroassist.trn.infrastructure.persistence.repository.OutboundJobJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OutboundJobRepositoryAdapter implements OutboundJobRepositoryPort {

    private final OutboundJobJpaRepository repository;

    @Override
    public OutboundJob save(OutboundJob entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<OutboundJob> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<OutboundJob> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
