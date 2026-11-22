package com.neuroassist.trn.infrastructure.persistence.adapter;

import com.neuroassist.trn.application.port.out.VoiceSampleRepositoryPort;
import com.neuroassist.trn.domain.model.VoiceSample;
import com.neuroassist.trn.infrastructure.persistence.repository.VoiceSampleJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class VoiceSampleRepositoryAdapter implements VoiceSampleRepositoryPort {

    private final VoiceSampleJpaRepository repository;

    @Override
    public VoiceSample save(VoiceSample entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<VoiceSample> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<VoiceSample> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
