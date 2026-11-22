package com.neuroassist.acs.application.service;

import com.neuroassist.acs.application.port.in.PatientSessionUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PatientSessionService implements PatientSessionUseCase {

    @Override
    public void provision() {
        throw new UnsupportedOperationException("provision not implemented");
    }

    @Override
    public void revoke() {
        throw new UnsupportedOperationException("revoke not implemented");
    }

    @Override
    public void findById() {
        throw new UnsupportedOperationException("findById not implemented");
    }
}
