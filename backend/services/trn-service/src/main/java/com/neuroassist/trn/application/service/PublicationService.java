package com.neuroassist.trn.application.service;

import com.neuroassist.trn.application.port.in.PublicationUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PublicationService implements PublicationUseCase {

    @Override
    public void create() {
        throw new UnsupportedOperationException("create not implemented");
    }

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }
}
