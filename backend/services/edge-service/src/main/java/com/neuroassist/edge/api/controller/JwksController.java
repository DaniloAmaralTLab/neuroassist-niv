package com.neuroassist.edge.api.controller;

import com.neuroassist.edge.application.port.in.JwksUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Security: @PreAuthorize derived from rbac.arch.json via the module generator.
// To change which permission gates a method, edit rbac.arch.json and re-run
// be-module-generator.py; do not patch the annotation by hand.
@Slf4j
@RestController
@RequestMapping("/edge/.well-known")
@RequiredArgsConstructor
public class JwksController {

    private final JwksUseCase jwksUseCase;

    @GetMapping("/{id}")
    // Public endpoint (D-642): reachable without a token — no @PreAuthorize by design.
    public ResponseEntity<Void> getJwks() {
        // TODO[SCAFFOLD]: delegate to JwksUseCase
        throw new UnsupportedOperationException("getJwks not implemented");
    }
}
