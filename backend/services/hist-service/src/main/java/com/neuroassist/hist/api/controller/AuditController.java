package com.neuroassist.hist.api.controller;

import com.neuroassist.hist.application.port.in.AuditUseCase;
import com.neuroassist.hist.shared.audit.AuditAction;
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
@RequestMapping("/hist/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditUseCase auditUseCase;

    @PostMapping
    @PreAuthorize("hasAuthority('hist.audit.record')")
    @AuditAction("CREATE_AUDIT")
    public ResponseEntity<Void> record() {
        // TODO[SCAFFOLD]: delegate to AuditUseCase
        throw new UnsupportedOperationException("record not implemented");
    }

    @GetMapping
    @PreAuthorize("hasAuthority('hist.audit.read')")
    public ResponseEntity<Void> query() {
        // TODO[SCAFFOLD]: delegate to AuditUseCase
        throw new UnsupportedOperationException("query not implemented");
    }
}
