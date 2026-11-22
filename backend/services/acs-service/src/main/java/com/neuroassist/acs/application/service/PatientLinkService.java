package com.neuroassist.acs.application.service;

import com.neuroassist.acs.application.port.in.PatientLinkUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PatientLinkService implements PatientLinkUseCase {

    @Override
    public void link() {
        throw new UnsupportedOperationException("link not implemented");
    }

    @Override
    public void unlink() {
        throw new UnsupportedOperationException("unlink not implemented");
    }

    @Override
    public void listLinks() {
        throw new UnsupportedOperationException("listLinks not implemented");
    }
}
