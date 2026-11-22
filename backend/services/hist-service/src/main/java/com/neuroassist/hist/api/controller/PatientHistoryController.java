package com.neuroassist.hist.api.controller;

import com.neuroassist.hist.application.port.in.PatientHistoryUseCase;
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
@RequestMapping("/hist/patients/{patientId}/history")
@RequiredArgsConstructor
public class PatientHistoryController {

    private final PatientHistoryUseCase patientHistoryUseCase;

    @GetMapping
    @PreAuthorize("hasAuthority('hist.history.read')")
    public ResponseEntity<Void> list() {
        // TODO[SCAFFOLD]: delegate to PatientHistoryUseCase
        throw new UnsupportedOperationException("list not implemented");
    }
}
