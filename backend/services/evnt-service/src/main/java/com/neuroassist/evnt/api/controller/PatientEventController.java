package com.neuroassist.evnt.api.controller;

import com.neuroassist.evnt.application.port.in.PatientEventUseCase;
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
@RequestMapping("/evnt/patients/{patientId}")
@RequiredArgsConstructor
public class PatientEventController {

    private final PatientEventUseCase patientEventUseCase;

    @GetMapping("/get-active-alarm")
    @PreAuthorize("hasAuthority('evnt.event.read')")
    public ResponseEntity<Void> getActiveAlarm() {
        // TODO[SCAFFOLD]: delegate to PatientEventUseCase
        throw new UnsupportedOperationException("getActiveAlarm not implemented");
    }

    @GetMapping("/list-events")
    @PreAuthorize("hasAuthority('evnt.event.read')")
    public ResponseEntity<Void> listEvents() {
        // TODO[SCAFFOLD]: delegate to PatientEventUseCase
        throw new UnsupportedOperationException("listEvents not implemented");
    }
}
