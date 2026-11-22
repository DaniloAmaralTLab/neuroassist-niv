package com.neuroassist.trn.api.controller;

import com.neuroassist.trn.application.port.in.ErasureUseCase;
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
@RequestMapping("/trn/content")
@RequiredArgsConstructor
public class ErasureController {

    private final ErasureUseCase erasureUseCase;

    @DeleteMapping
    @PreAuthorize("hasAuthority('trn.content.delete')")
    @AuditAction("DELETE_CONTENT")
    public ResponseEntity<Void> delete() {
        // TODO[SCAFFOLD]: delegate to ErasureUseCase
        throw new UnsupportedOperationException("delete not implemented");
    }
}
