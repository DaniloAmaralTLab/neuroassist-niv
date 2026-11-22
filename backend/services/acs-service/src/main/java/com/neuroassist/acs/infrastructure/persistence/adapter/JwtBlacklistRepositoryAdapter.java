package com.neuroassist.acs.infrastructure.persistence.adapter;

import com.neuroassist.acs.application.port.out.JwtBlacklistRepositoryPort;
import com.neuroassist.acs.domain.model.JwtBlacklist;
import com.neuroassist.acs.infrastructure.persistence.repository.JwtBlacklistJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtBlacklistRepositoryAdapter implements JwtBlacklistRepositoryPort {

    private final JwtBlacklistJpaRepository repository;

    @Override
    public JwtBlacklist save(JwtBlacklist entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<JwtBlacklist> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<JwtBlacklist> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
