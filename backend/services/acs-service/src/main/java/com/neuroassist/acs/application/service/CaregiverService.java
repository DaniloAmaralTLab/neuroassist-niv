package com.neuroassist.acs.application.service;

import com.neuroassist.acs.application.port.in.CaregiverUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CaregiverService implements CaregiverUseCase {

    @Override
    public void register() {
        throw new UnsupportedOperationException("register not implemented");
    }

    @Override
    public void deactivate() {
        throw new UnsupportedOperationException("deactivate not implemented");
    }

    @Override
    public void getProfile() {
        throw new UnsupportedOperationException("getProfile not implemented");
    }
}
