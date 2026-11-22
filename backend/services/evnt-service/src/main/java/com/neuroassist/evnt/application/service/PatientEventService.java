package com.neuroassist.evnt.application.service;

import com.neuroassist.evnt.application.port.in.PatientEventUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PatientEventService implements PatientEventUseCase {

    @Override
    public void getActiveAlarm() {
        throw new UnsupportedOperationException("getActiveAlarm not implemented");
    }

    @Override
    public void listEvents() {
        throw new UnsupportedOperationException("listEvents not implemented");
    }
}
