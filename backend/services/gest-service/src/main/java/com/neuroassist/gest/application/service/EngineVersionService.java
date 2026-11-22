package com.neuroassist.gest.application.service;

import com.neuroassist.gest.application.port.in.EngineVersionUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EngineVersionService implements EngineVersionUseCase {

    @Override
    public void list() {
        throw new UnsupportedOperationException("list not implemented");
    }

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }

    @Override
    public void register() {
        throw new UnsupportedOperationException("register not implemented");
    }

    @Override
    public void deprecate() {
        throw new UnsupportedOperationException("deprecate not implemented");
    }
}
