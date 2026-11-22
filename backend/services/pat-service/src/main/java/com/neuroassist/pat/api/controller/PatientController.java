package com.neuroassist.pat.api.controller;

import com.neuroassist.pat.application.port.in.PatientUseCase;
import com.neuroassist.pat.shared.audit.AuditAction;
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
@RequestMapping("/pat-service/patient")
@RequiredArgsConstructor
public class PatientController {

    private final PatientUseCase patientUseCase;

    @PostMapping("/register")
    @PreAuthorize("hasAuthority('pat.patient.create')")
    @AuditAction("CREATE_PATIENT")
    public ResponseEntity<Void> register() {
        // TODO[SCAFFOLD]: delegate to PatientUseCase
        throw new UnsupportedOperationException("register not implemented");
    }

    @GetMapping("/list")
    @PreAuthorize("hasAuthority('pat.patient.read')")
    public ResponseEntity<Void> list() {
        // TODO[SCAFFOLD]: delegate to PatientUseCase
        throw new UnsupportedOperationException("list not implemented");
    }

    @GetMapping("/get")
    @PreAuthorize("hasAuthority('pat.patient.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to PatientUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PostMapping("/deactivate")
    @PreAuthorize("hasAuthority('pat.patient.deactivate')")
    @AuditAction("UPDATE_PATIENT")
    public ResponseEntity<Void> deactivate() {
        // TODO[SCAFFOLD]: delegate to PatientUseCase
        throw new UnsupportedOperationException("deactivate not implemented");
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('pat.patient.activate')")
    @AuditAction("UPDATE_PATIENT")
    public ResponseEntity<Void> activate() {
        // TODO[SCAFFOLD]: delegate to PatientUseCase
        throw new UnsupportedOperationException("activate not implemented");
    }
}
