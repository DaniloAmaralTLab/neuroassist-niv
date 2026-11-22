package com.neuroassist.acs.api.controller;

import com.neuroassist.acs.application.port.in.PatientSessionUseCase;
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
@RequestMapping("/acs-service/patient-session")
@RequiredArgsConstructor
public class PatientSessionController {

    private final PatientSessionUseCase patientSessionUseCase;

    @PostMapping
    @PreAuthorize("hasAuthority('acs.patient-session.provision')")
    @AuditAction("CREATE_PATIENT_SESSION")
    public ResponseEntity<Void> provision() {
        // TODO[SCAFFOLD]: delegate to PatientSessionUseCase
        throw new UnsupportedOperationException("provision not implemented");
    }

    @DeleteMapping
    @PreAuthorize("hasAuthority('acs.patient-session.revoke')")
    @AuditAction("DELETE_PATIENT_SESSION")
    public ResponseEntity<Void> revoke() {
        // TODO[SCAFFOLD]: delegate to PatientSessionUseCase
        throw new UnsupportedOperationException("revoke not implemented");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('acs.patient-session.read')")
    public ResponseEntity<Void> findById() {
        // TODO[SCAFFOLD]: delegate to PatientSessionUseCase
        throw new UnsupportedOperationException("findById not implemented");
    }
}
