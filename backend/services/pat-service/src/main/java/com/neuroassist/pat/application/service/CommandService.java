package com.neuroassist.pat.application.service;

import com.neuroassist.pat.application.port.in.CommandUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CommandService implements CommandUseCase {

    @Override
    public void create() {
        throw new UnsupportedOperationException("create not implemented");
    }

    @Override
    public void list() {
        throw new UnsupportedOperationException("list not implemented");
    }

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }

    @Override
    public void calibrate() {
        throw new UnsupportedOperationException("calibrate not implemented");
    }

    @Override
    public void retire() {
        throw new UnsupportedOperationException("retire not implemented");
    }
}
