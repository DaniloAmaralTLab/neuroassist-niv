package com.neuroassist.gest.api.controller;

import com.neuroassist.gest.application.port.in.CapabilityUseCase;
import com.neuroassist.gest.shared.audit.AuditAction;
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
@RequestMapping("/gest/capabilities")
@RequiredArgsConstructor
public class CapabilityController {

    private final CapabilityUseCase capabilityUseCase;

    @GetMapping("/list")
    @PreAuthorize("hasAuthority('gest.capability.read')")
    public ResponseEntity<Void> list() {
        // TODO[SCAFFOLD]: delegate to CapabilityUseCase
        throw new UnsupportedOperationException("list not implemented");
    }

    @GetMapping("/get")
    @PreAuthorize("hasAuthority('gest.capability.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to CapabilityUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PutMapping("/declare")
    @PreAuthorize("hasAuthority('gest.capability.create')")
    @AuditAction("CREATE_CAPABILITY")
    public ResponseEntity<Void> declare() {
        // TODO[SCAFFOLD]: delegate to CapabilityUseCase
        throw new UnsupportedOperationException("declare not implemented");
    }

    @PutMapping("/retire")
    @PreAuthorize("hasAuthority('gest.capability.retire')")
    @AuditAction("UPDATE_CAPABILITY")
    public ResponseEntity<Void> retire() {
        // TODO[SCAFFOLD]: delegate to CapabilityUseCase
        throw new UnsupportedOperationException("retire not implemented");
    }

    @PutMapping("/check-support")
    @PreAuthorize("hasAuthority('gest.capability.read')")
    public ResponseEntity<Void> checkSupport() {
        // TODO[SCAFFOLD]: delegate to CapabilityUseCase
        throw new UnsupportedOperationException("checkSupport not implemented");
    }
}
