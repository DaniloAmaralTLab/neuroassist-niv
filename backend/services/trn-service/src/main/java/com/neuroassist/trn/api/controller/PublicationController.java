package com.neuroassist.trn.api.controller;

import com.neuroassist.trn.application.port.in.PublicationUseCase;
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
@RequestMapping("/trn/publications")
@RequiredArgsConstructor
public class PublicationController {

    private final PublicationUseCase publicationUseCase;

    @PostMapping
    @PreAuthorize("hasAuthority('trn.publication.create')")
    @AuditAction("CREATE_PUBLICATION")
    public ResponseEntity<Void> create() {
        // TODO[SCAFFOLD]: delegate to PublicationUseCase
        throw new UnsupportedOperationException("create not implemented");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('trn.publication.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to PublicationUseCase
        throw new UnsupportedOperationException("get not implemented");
    }
}
