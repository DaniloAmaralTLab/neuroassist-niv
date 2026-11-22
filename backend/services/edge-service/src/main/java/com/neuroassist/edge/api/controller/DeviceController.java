package com.neuroassist.edge.api.controller;

import com.neuroassist.edge.application.port.in.DeviceUseCase;
import com.neuroassist.edge.shared.audit.AuditAction;
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
@RequestMapping("/edge/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceUseCase deviceUseCase;

    @PostMapping("/enroll")
    @PreAuthorize("hasAuthority('edge.device.enroll')")
    @AuditAction("CREATE_DEVICE")
    public ResponseEntity<Void> enroll() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("enroll not implemented");
    }

    @GetMapping("/list")
    @PreAuthorize("hasAuthority('edge.device.read')")
    public ResponseEntity<Void> list() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("list not implemented");
    }

    @GetMapping("/get")
    @PreAuthorize("hasAuthority('edge.device.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('edge.device.activate')")
    @AuditAction("UPDATE_DEVICE")
    public ResponseEntity<Void> activate() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("activate not implemented");
    }

    @PostMapping("/pair")
    // Public endpoint (D-642): reachable without a token — no @PreAuthorize by design.
    @AuditAction("CREATE_DEVICE")
    public ResponseEntity<Void> pair() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("pair not implemented");
    }

    @PostMapping("/deactivate")
    @PreAuthorize("hasAuthority('edge.device.deactivate')")
    @AuditAction("UPDATE_DEVICE")
    public ResponseEntity<Void> deactivate() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("deactivate not implemented");
    }

    @DeleteMapping("/unpair")
    @PreAuthorize("hasAuthority('edge.device.unpair')")
    @AuditAction("DELETE_DEVICE")
    public ResponseEntity<Void> unpair() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("unpair not implemented");
    }

    @DeleteMapping("/revoke")
    @PreAuthorize("hasAuthority('edge.device.revoke')")
    @AuditAction("DELETE_DEVICE")
    public ResponseEntity<Void> revoke() {
        // TODO[SCAFFOLD]: delegate to DeviceUseCase
        throw new UnsupportedOperationException("revoke not implemented");
    }
}
