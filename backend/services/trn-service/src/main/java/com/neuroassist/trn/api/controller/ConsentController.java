package com.neuroassist.trn.api.controller;

import com.neuroassist.trn.application.port.in.ConsentUseCase;
import com.neuroassist.trn.shared.audit.AuditAction;
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
@RequestMapping("/trn/consents")
@RequiredArgsConstructor
public class ConsentController {

    private final ConsentUseCase consentUseCase;

    @PostMapping
    @PreAuthorize("hasAuthority('trn.consent.create')")
    @AuditAction("CREATE_CONSENT")
    public ResponseEntity<Void> create() {
        // TODO[SCAFFOLD]: delegate to ConsentUseCase
        throw new UnsupportedOperationException("create not implemented");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('trn.consent.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to ConsentUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @DeleteMapping
    @PreAuthorize("hasAuthority('trn.consent.revoke')")
    @AuditAction("DELETE_CONSENT")
    public ResponseEntity<Void> revoke() {
        // TODO[SCAFFOLD]: delegate to ConsentUseCase
        throw new UnsupportedOperationException("revoke not implemented");
    }
}
