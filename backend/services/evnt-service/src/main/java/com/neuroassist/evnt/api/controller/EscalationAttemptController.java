package com.neuroassist.evnt.api.controller;

import com.neuroassist.evnt.application.port.in.EscalationAttemptUseCase;
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
@RequestMapping("/evnt/events/{eventId}/escalation-attempts")
@RequiredArgsConstructor
public class EscalationAttemptController {

    private final EscalationAttemptUseCase escalationAttemptUseCase;

    @GetMapping
    @PreAuthorize("hasAuthority('evnt.escalation.read')")
    public ResponseEntity<Void> listEscalationAttempts() {
        // TODO[SCAFFOLD]: delegate to EscalationAttemptUseCase
        throw new UnsupportedOperationException("listEscalationAttempts not implemented");
    }
}
