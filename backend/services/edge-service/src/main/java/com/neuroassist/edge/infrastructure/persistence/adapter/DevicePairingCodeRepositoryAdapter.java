package com.neuroassist.edge.infrastructure.persistence.adapter;

import com.neuroassist.edge.application.port.out.DevicePairingCodeRepositoryPort;
import com.neuroassist.edge.domain.model.DevicePairingCode;
import com.neuroassist.edge.infrastructure.persistence.repository.DevicePairingCodeJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DevicePairingCodeRepositoryAdapter implements DevicePairingCodeRepositoryPort {

    private final DevicePairingCodeJpaRepository repository;

    @Override
    public DevicePairingCode save(DevicePairingCode entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<DevicePairingCode> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<DevicePairingCode> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
