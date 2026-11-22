package com.neuroassist.acs.application.service;

import com.neuroassist.acs.application.port.in.TenantUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TenantService implements TenantUseCase {

    @Override
    public void onboard() {
        throw new UnsupportedOperationException("onboard not implemented");
    }
}
