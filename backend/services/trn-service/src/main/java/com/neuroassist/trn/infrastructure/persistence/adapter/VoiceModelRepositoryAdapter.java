package com.neuroassist.trn.infrastructure.persistence.adapter;

import com.neuroassist.trn.application.port.out.VoiceModelRepositoryPort;
import com.neuroassist.trn.domain.model.VoiceModel;
import com.neuroassist.trn.infrastructure.persistence.repository.VoiceModelJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class VoiceModelRepositoryAdapter implements VoiceModelRepositoryPort {

    private final VoiceModelJpaRepository repository;

    @Override
    public VoiceModel save(VoiceModel entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<VoiceModel> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<VoiceModel> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
