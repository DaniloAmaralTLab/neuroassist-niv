package com.neuroassist.pat.api.controller;

import com.neuroassist.pat.application.port.in.GestureTypeUseCase;
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
@RequestMapping("/pat-service/gesture-type")
@RequiredArgsConstructor
public class GestureTypeController {

    private final GestureTypeUseCase gestureTypeUseCase;

    @GetMapping("/list")
    @PreAuthorize("hasAuthority('pat.gesture-type.read')")
    public ResponseEntity<Void> list() {
        // TODO[SCAFFOLD]: delegate to GestureTypeUseCase
        throw new UnsupportedOperationException("list not implemented");
    }

    @GetMapping("/get")
    @PreAuthorize("hasAuthority('pat.gesture-type.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to GestureTypeUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PostMapping
    @PreAuthorize("hasAuthority('pat.gesture-type.create')")
    @AuditAction("CREATE_GESTURE_TYPE")
    public ResponseEntity<Void> register() {
        // TODO[SCAFFOLD]: delegate to GestureTypeUseCase
        throw new UnsupportedOperationException("register not implemented");
    }
}
