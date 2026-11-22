package com.neuroassist.edge.api.controller;

import com.neuroassist.edge.application.port.in.DeviceTokenUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

// Security: @PreAuthorize derived from rbac.arch.json via the module generator.
// To change which permission gates a method, edit rbac.arch.json and re-run
// be-module-generator.py; do not patch the annotation by hand.
@Slf4j
@RestController
@RequestMapping("/edge/device-tokens")
@RequiredArgsConstructor
public class DeviceTokenController {

    private final DeviceTokenUseCase deviceTokenUseCase;

    @PutMapping("/{id}/introspect")
    @PreAuthorize("hasAuthority('edge.device-token.introspect')")
    public ResponseEntity<Void> introspect() {
        // TODO[SCAFFOLD]: delegate to DeviceTokenUseCase
        throw new UnsupportedOperationException("introspect not implemented");
    }
}
