package com.neuroassist.pat.application.service;

import com.neuroassist.pat.application.port.in.PatientUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PatientService implements PatientUseCase {

    @Override
    public void register() {
        throw new UnsupportedOperationException("register not implemented");
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
    public void deactivate() {
        throw new UnsupportedOperationException("deactivate not implemented");
    }

    @Override
    public void activate() {
        throw new UnsupportedOperationException("activate not implemented");
    }
}
