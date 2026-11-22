package com.neuroassist.pat.api.controller;

import com.neuroassist.pat.application.port.in.CommandUseCase;
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
@RequestMapping("/pat-service/command")
@RequiredArgsConstructor
public class CommandController {

    private final CommandUseCase commandUseCase;

    @PostMapping
    @PreAuthorize("hasAuthority('pat.command.create')")
    @AuditAction("CREATE_COMMAND")
    public ResponseEntity<Void> create() {
        // TODO[SCAFFOLD]: delegate to CommandUseCase
        throw new UnsupportedOperationException("create not implemented");
    }

    @GetMapping("/list")
    @PreAuthorize("hasAuthority('pat.command.read')")
    public ResponseEntity<Void> list() {
        // TODO[SCAFFOLD]: delegate to CommandUseCase
        throw new UnsupportedOperationException("list not implemented");
    }

    @GetMapping("/get")
    @PreAuthorize("hasAuthority('pat.command.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to CommandUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PutMapping("/calibrate")
    @PreAuthorize("hasAuthority('pat.command.calibrate')")
    @AuditAction("UPDATE_COMMAND")
    public ResponseEntity<Void> calibrate() {
        // TODO[SCAFFOLD]: delegate to CommandUseCase
        throw new UnsupportedOperationException("calibrate not implemented");
    }

    @PutMapping("/retire")
    @PreAuthorize("hasAuthority('pat.command.retire')")
    @AuditAction("UPDATE_COMMAND")
    public ResponseEntity<Void> retire() {
        // TODO[SCAFFOLD]: delegate to CommandUseCase
        throw new UnsupportedOperationException("retire not implemented");
    }
}
