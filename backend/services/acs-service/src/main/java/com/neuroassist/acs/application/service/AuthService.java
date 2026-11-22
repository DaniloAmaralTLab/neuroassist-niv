package com.neuroassist.acs.application.service;

import com.neuroassist.acs.application.port.in.AuthUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService implements AuthUseCase {

    @Override
    public void authenticate() {
        throw new UnsupportedOperationException("authenticate not implemented");
    }

    @Override
    public void introspect() {
        throw new UnsupportedOperationException("introspect not implemented");
    }

    @Override
    public void getJwks() {
        throw new UnsupportedOperationException("getJwks not implemented");
    }
}
