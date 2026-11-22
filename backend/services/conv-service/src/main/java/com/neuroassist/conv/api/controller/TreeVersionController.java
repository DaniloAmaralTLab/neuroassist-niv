package com.neuroassist.conv.api.controller;

import com.neuroassist.conv.application.port.in.TreeVersionUseCase;
import com.neuroassist.conv.shared.audit.AuditAction;
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
@RequestMapping("/conv/tree-versions")
@RequiredArgsConstructor
public class TreeVersionController {

    private final TreeVersionUseCase treeVersionUseCase;

    @PutMapping("/{id}/retire")
    @PreAuthorize("hasAuthority('conv.tree-version.retire')")
    @AuditAction("UPDATE_TREE_VERSION")
    public ResponseEntity<Void> retire() {
        // TODO[SCAFFOLD]: delegate to TreeVersionUseCase
        throw new UnsupportedOperationException("retire not implemented");
    }
}
