package com.neuroassist.evnt.application.service;

import com.neuroassist.evnt.application.port.in.EventUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EventService implements EventUseCase {

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }

    @Override
    public void confirm() {
        throw new UnsupportedOperationException("confirm not implemented");
    }

    @Override
    public void record() {
        throw new UnsupportedOperationException("record not implemented");
    }
}
