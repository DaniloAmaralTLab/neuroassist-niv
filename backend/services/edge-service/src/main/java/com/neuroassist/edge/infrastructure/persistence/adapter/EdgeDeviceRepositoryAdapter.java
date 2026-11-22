package com.neuroassist.edge.infrastructure.persistence.adapter;

import com.neuroassist.edge.application.port.out.EdgeDeviceRepositoryPort;
import com.neuroassist.edge.domain.model.EdgeDevice;
import com.neuroassist.edge.infrastructure.persistence.repository.EdgeDeviceJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EdgeDeviceRepositoryAdapter implements EdgeDeviceRepositoryPort {

    private final EdgeDeviceJpaRepository repository;

    @Override
    public EdgeDevice save(EdgeDevice entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<EdgeDevice> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<EdgeDevice> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
