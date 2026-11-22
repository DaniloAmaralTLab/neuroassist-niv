package com.neuroassist.evnt.infrastructure.persistence.adapter;

import com.neuroassist.evnt.application.port.out.EventRepositoryPort;
import com.neuroassist.evnt.domain.model.Event;
import com.neuroassist.evnt.infrastructure.persistence.repository.EventJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EventRepositoryAdapter implements EventRepositoryPort {

    private final EventJpaRepository repository;

    @Override
    public Event save(Event entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<Event> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<Event> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
