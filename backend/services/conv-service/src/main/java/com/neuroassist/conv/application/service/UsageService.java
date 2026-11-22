package com.neuroassist.conv.application.service;

import com.neuroassist.conv.application.port.in.UsageUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UsageService implements UsageUseCase {

    @Override
    public void record() {
        throw new UnsupportedOperationException("record not implemented");
    }
}
