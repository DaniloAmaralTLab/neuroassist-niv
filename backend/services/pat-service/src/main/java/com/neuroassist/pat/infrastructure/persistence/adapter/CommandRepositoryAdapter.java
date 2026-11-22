package com.neuroassist.pat.infrastructure.persistence.adapter;

import com.neuroassist.pat.application.port.out.CommandRepositoryPort;
import com.neuroassist.pat.domain.model.Command;
import com.neuroassist.pat.infrastructure.persistence.repository.CommandJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommandRepositoryAdapter implements CommandRepositoryPort {

    private final CommandJpaRepository repository;

    @Override
    public Command save(Command entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<Command> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<Command> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
