package com.neuroassist.conv.infrastructure.persistence.adapter;

import com.neuroassist.conv.application.port.out.AudioAssetRepositoryPort;
import com.neuroassist.conv.domain.model.AudioAsset;
import com.neuroassist.conv.infrastructure.persistence.repository.AudioAssetJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AudioAssetRepositoryAdapter implements AudioAssetRepositoryPort {

    private final AudioAssetJpaRepository repository;

    @Override
    public AudioAsset save(AudioAsset entity) {
        // TODO[SCAFFOLD]: map domain model → JPA entity → save → map back
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public Optional<AudioAsset> findById(UUID id) {
        // TODO[SCAFFOLD]: map JPA entity → domain model
        throw new UnsupportedOperationException("not implemented");
    }

    @Override
    public List<AudioAsset> findByTenantId(String tenantId) {
        // TODO[SCAFFOLD]: map JPA entities → domain models
        throw new UnsupportedOperationException("not implemented");
    }
}
