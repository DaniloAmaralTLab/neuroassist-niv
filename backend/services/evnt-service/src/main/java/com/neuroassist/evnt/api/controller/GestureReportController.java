package com.neuroassist.evnt.api.controller;

import com.neuroassist.evnt.application.port.in.GestureReportUseCase;
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
@RequestMapping("/evnt/gesture-reports")
@RequiredArgsConstructor
public class GestureReportController {

    private final GestureReportUseCase gestureReportUseCase;

    @PutMapping("/{id}/ingest")
    @PreAuthorize("hasAuthority('evnt.event.ingest')")
    @AuditAction("CREATE_EVENT")
    public ResponseEntity<Void> ingest() {
        // TODO[SCAFFOLD]: delegate to GestureReportUseCase
        throw new UnsupportedOperationException("ingest not implemented");
    }
}
