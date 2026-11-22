package com.neuroassist.hist.application.service;

import com.neuroassist.hist.application.port.in.AuditUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuditService implements AuditUseCase {

    @Override
    public void record() {
        throw new UnsupportedOperationException("record not implemented");
    }

    @Override
    public void query() {
        throw new UnsupportedOperationException("query not implemented");
    }
}
