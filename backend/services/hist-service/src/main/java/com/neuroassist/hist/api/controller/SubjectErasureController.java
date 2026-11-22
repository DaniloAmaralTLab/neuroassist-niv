package com.neuroassist.hist.api.controller;

import com.neuroassist.hist.application.port.in.SubjectErasureUseCase;
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
@RequestMapping("/hist/subjects/{subjectId}/erasure")
@RequiredArgsConstructor
public class SubjectErasureController {

    private final SubjectErasureUseCase subjectErasureUseCase;

    @PostMapping
    @PreAuthorize("hasAuthority('hist.erasure.create')")
    @AuditAction("CREATE_ERASURE")
    public ResponseEntity<Void> requestErasure() {
        // TODO[SCAFFOLD]: delegate to SubjectErasureUseCase
        throw new UnsupportedOperationException("requestErasure not implemented");
    }
}
