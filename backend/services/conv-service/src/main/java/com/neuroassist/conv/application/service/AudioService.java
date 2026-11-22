package com.neuroassist.conv.application.service;

import com.neuroassist.conv.application.port.in.AudioUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AudioService implements AudioUseCase {

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }

    @Override
    public void delete() {
        throw new UnsupportedOperationException("delete not implemented");
    }
}
