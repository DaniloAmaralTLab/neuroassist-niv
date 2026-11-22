package com.neuroassist.evnt.application.service;

import com.neuroassist.evnt.application.port.in.PushSubscriptionUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PushSubscriptionService implements PushSubscriptionUseCase {

    @Override
    public void create() {
        throw new UnsupportedOperationException("create not implemented");
    }

    @Override
    public void delete() {
        throw new UnsupportedOperationException("delete not implemented");
    }
}
