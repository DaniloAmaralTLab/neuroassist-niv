package com.neuroassist.edge.application.service;

import com.neuroassist.edge.application.port.in.JwksUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class JwksService implements JwksUseCase {

    @Override
    public void getJwks() {
        throw new UnsupportedOperationException("getJwks not implemented");
    }
}
