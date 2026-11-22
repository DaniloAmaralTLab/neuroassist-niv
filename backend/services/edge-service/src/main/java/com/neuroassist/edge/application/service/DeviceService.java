package com.neuroassist.edge.application.service;

import com.neuroassist.edge.application.port.in.DeviceUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DeviceService implements DeviceUseCase {

    @Override
    public void enroll() {
        throw new UnsupportedOperationException("enroll not implemented");
    }

    @Override
    public void list() {
        throw new UnsupportedOperationException("list not implemented");
    }

    @Override
    public void get() {
        throw new UnsupportedOperationException("get not implemented");
    }

    @Override
    public void activate() {
        throw new UnsupportedOperationException("activate not implemented");
    }

    @Override
    public void pair() {
        throw new UnsupportedOperationException("pair not implemented");
    }

    @Override
    public void deactivate() {
        throw new UnsupportedOperationException("deactivate not implemented");
    }

    @Override
    public void unpair() {
        throw new UnsupportedOperationException("unpair not implemented");
    }

    @Override
    public void revoke() {
        throw new UnsupportedOperationException("revoke not implemented");
    }
}
