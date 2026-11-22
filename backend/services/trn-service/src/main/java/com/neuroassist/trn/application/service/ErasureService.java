package com.neuroassist.trn.application.service;

import com.neuroassist.trn.application.port.in.ErasureUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ErasureService implements ErasureUseCase {

    @Override
    public void delete() {
        throw new UnsupportedOperationException("delete not implemented");
    }
}
