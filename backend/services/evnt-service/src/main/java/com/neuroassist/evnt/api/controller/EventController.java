package com.neuroassist.evnt.api.controller;

import com.neuroassist.evnt.application.port.in.EventUseCase;
import com.neuroassist.evnt.shared.audit.AuditAction;
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
@RequestMapping("/evnt/events")
@RequiredArgsConstructor
public class EventController {

    private final EventUseCase eventUseCase;

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('evnt.event.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to EventUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('evnt.event.confirm')")
    @AuditAction("UPDATE_EVENT")
    public ResponseEntity<Void> confirm() {
        // TODO[SCAFFOLD]: delegate to EventUseCase
        throw new UnsupportedOperationException("confirm not implemented");
    }

    @PostMapping
    @PreAuthorize("hasAuthority('evnt.event.record')")
    @AuditAction("CREATE_EVENT")
    public ResponseEntity<Void> record() {
        // TODO[SCAFFOLD]: delegate to EventUseCase
        throw new UnsupportedOperationException("record not implemented");
    }
}
