package com.neuroassist.gest.api.controller;

import com.neuroassist.gest.application.port.in.EngineVersionUseCase;
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
@RequestMapping("/gest/engines")
@RequiredArgsConstructor
public class EngineVersionController {

    private final EngineVersionUseCase engineVersionUseCase;

    @GetMapping("/list")
    @PreAuthorize("hasAuthority('gest.engine.read')")
    public ResponseEntity<Void> list() {
        // TODO[SCAFFOLD]: delegate to EngineVersionUseCase
        throw new UnsupportedOperationException("list not implemented");
    }

    @GetMapping("/get")
    @PreAuthorize("hasAuthority('gest.engine.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to EngineVersionUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PostMapping
    @PreAuthorize("hasAuthority('gest.engine.create')")
    @AuditAction("CREATE_ENGINE")
    public ResponseEntity<Void> register() {
        // TODO[SCAFFOLD]: delegate to EngineVersionUseCase
        throw new UnsupportedOperationException("register not implemented");
    }

    @PutMapping("/{id}/deprecate")
    @PreAuthorize("hasAuthority('gest.engine.retire')")
    @AuditAction("UPDATE_ENGINE")
    public ResponseEntity<Void> deprecate() {
        // TODO[SCAFFOLD]: delegate to EngineVersionUseCase
        throw new UnsupportedOperationException("deprecate not implemented");
    }
}
