package com.neuroassist.acs.api.controller;

import com.neuroassist.acs.application.port.in.CaregiverUseCase;
import com.neuroassist.acs.shared.audit.AuditAction;
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
@RequestMapping("/acs-service/caregiver")
@RequiredArgsConstructor
public class CaregiverController {

    private final CaregiverUseCase caregiverUseCase;

    @PostMapping("/register")
    @PreAuthorize("hasAuthority('acs.caregiver.create')")
    @AuditAction("CREATE_CAREGIVER")
    public ResponseEntity<Void> register() {
        // TODO[SCAFFOLD]: delegate to CaregiverUseCase
        throw new UnsupportedOperationException("register not implemented");
    }

    @PostMapping("/deactivate")
    @PreAuthorize("hasAuthority('acs.caregiver.deactivate')")
    @AuditAction("UPDATE_CAREGIVER")
    public ResponseEntity<Void> deactivate() {
        // TODO[SCAFFOLD]: delegate to CaregiverUseCase
        throw new UnsupportedOperationException("deactivate not implemented");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('acs.caregiver.read')")
    public ResponseEntity<Void> getProfile() {
        // TODO[SCAFFOLD]: delegate to CaregiverUseCase
        throw new UnsupportedOperationException("getProfile not implemented");
    }
}
