package com.neuroassist.acs.api.controller;

import com.neuroassist.acs.application.port.in.AuthUseCase;
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
@RequestMapping("/acs-service/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthUseCase authUseCase;

    @PostMapping
    // Public endpoint (D-642): reachable without a token — no @PreAuthorize by design.
    @AuditAction("CREATE_AUTH")
    public ResponseEntity<Void> authenticate() {
        // TODO[SCAFFOLD]: delegate to AuthUseCase
        throw new UnsupportedOperationException("authenticate not implemented");
    }

    @PutMapping("/{id}/introspect")
    @PreAuthorize("hasAuthority('acs.auth.introspect')")
    public ResponseEntity<Void> introspect() {
        // TODO[SCAFFOLD]: delegate to AuthUseCase
        throw new UnsupportedOperationException("introspect not implemented");
    }

    @GetMapping("/{id}")
    // Public endpoint (D-642): reachable without a token — no @PreAuthorize by design.
    public ResponseEntity<Void> getJwks() {
        // TODO[SCAFFOLD]: delegate to AuthUseCase
        throw new UnsupportedOperationException("getJwks not implemented");
    }
}
