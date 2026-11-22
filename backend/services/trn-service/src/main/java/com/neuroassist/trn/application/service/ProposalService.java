package com.neuroassist.trn.application.service;

import com.neuroassist.trn.application.port.in.ProposalUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProposalService implements ProposalUseCase {

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }

    @Override
    public void update() {
        throw new UnsupportedOperationException("update not implemented");
    }

    @Override
    public void approve() {
        throw new UnsupportedOperationException("approve not implemented");
    }

    @Override
    public void reject() {
        throw new UnsupportedOperationException("reject not implemented");
    }
}
