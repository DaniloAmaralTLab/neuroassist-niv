package com.neuroassist.conv.application.service;

import com.neuroassist.conv.application.port.in.TreeVersionUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TreeVersionService implements TreeVersionUseCase {

    @Override
    public void retire() {
        throw new UnsupportedOperationException("retire not implemented");
    }
}
