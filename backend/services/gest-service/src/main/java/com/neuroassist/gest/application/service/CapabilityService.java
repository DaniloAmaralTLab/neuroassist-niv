package com.neuroassist.gest.application.service;

import com.neuroassist.gest.application.port.in.CapabilityUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CapabilityService implements CapabilityUseCase {

    @Override
    public void list() {
        throw new UnsupportedOperationException("list not implemented");
    }

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }

    @Override
    public void declare() {
        throw new UnsupportedOperationException("declare not implemented");
    }

    @Override
    public void retire() {
        throw new UnsupportedOperationException("retire not implemented");
    }

    @Override
    public void checkSupport() {
        throw new UnsupportedOperationException("checkSupport not implemented");
    }
}
