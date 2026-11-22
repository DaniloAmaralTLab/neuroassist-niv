package com.neuroassist.trn.infrastructure.persistence.adapter;

import com.neuroassist.trn.application.port.out.ProposalRepositoryPort;
import com.neuroassist.trn.domain.model.Proposal;
import com.neuroassist.trn.infrastructure.persistence.repository.ProposalJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProposalRepositoryAdapter implements ProposalRepositoryPort {

    private final ProposalJpaRepository repository;

    @Override
    public Proposal save(Proposal entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<Proposal> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<Proposal> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
