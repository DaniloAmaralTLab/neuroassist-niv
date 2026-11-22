package com.neuroassist.evnt.infrastructure.persistence.adapter;

import com.neuroassist.evnt.application.port.out.PushSubscriptionRepositoryPort;
import com.neuroassist.evnt.domain.model.PushSubscription;
import com.neuroassist.evnt.infrastructure.persistence.repository.PushSubscriptionJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PushSubscriptionRepositoryAdapter implements PushSubscriptionRepositoryPort {

    private final PushSubscriptionJpaRepository repository;

    @Override
    public PushSubscription save(PushSubscription entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<PushSubscription> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<PushSubscription> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
