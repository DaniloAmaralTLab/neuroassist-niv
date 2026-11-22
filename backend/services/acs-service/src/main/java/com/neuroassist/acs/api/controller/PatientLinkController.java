package com.neuroassist.acs.api.controller;

import com.neuroassist.acs.application.port.in.PatientLinkUseCase;
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
@RequestMapping("/acs-service/patient-link")
@RequiredArgsConstructor
public class PatientLinkController {

    private final PatientLinkUseCase patientLinkUseCase;

    @PostMapping
    @PreAuthorize("hasAuthority('acs.patient-link.link')")
    @AuditAction("CREATE_PATIENT_LINK")
    public ResponseEntity<Void> link() {
        // TODO[SCAFFOLD]: delegate to PatientLinkUseCase
        throw new UnsupportedOperationException("link not implemented");
    }

    @PutMapping("/{id}/unlink")
    @PreAuthorize("hasAuthority('acs.patient-link.unlink')")
    @AuditAction("DELETE_PATIENT_LINK")
    public ResponseEntity<Void> unlink() {
        // TODO[SCAFFOLD]: delegate to PatientLinkUseCase
        throw new UnsupportedOperationException("unlink not implemented");
    }

    @GetMapping
    @PreAuthorize("hasAuthority('acs.patient-link.read')")
    public ResponseEntity<Void> listLinks() {
        // TODO[SCAFFOLD]: delegate to PatientLinkUseCase
        throw new UnsupportedOperationException("listLinks not implemented");
    }
}
