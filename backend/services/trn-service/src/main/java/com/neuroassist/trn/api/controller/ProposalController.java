package com.neuroassist.trn.api.controller;

import com.neuroassist.trn.application.port.in.ProposalUseCase;
import com.neuroassist.trn.shared.audit.AuditAction;
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
@RequestMapping("/trn/proposals")
@RequiredArgsConstructor
public class ProposalController {

    private final ProposalUseCase proposalUseCase;

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('trn.proposal.read')")
    public ResponseEntity<Void> get() {
        // TODO[SCAFFOLD]: delegate to ProposalUseCase
        throw new UnsupportedOperationException("get not implemented");
    }

    @PutMapping("/update")
    @PreAuthorize("hasAuthority('trn.proposal.update')")
    @AuditAction("UPDATE_PROPOSAL")
    public ResponseEntity<Void> update() {
        // TODO[SCAFFOLD]: delegate to ProposalUseCase
        throw new UnsupportedOperationException("update not implemented");
    }

    @PutMapping("/approve")
    @PreAuthorize("hasAuthority('trn.proposal.approve')")
    @AuditAction("UPDATE_PROPOSAL")
    public ResponseEntity<Void> approve() {
        // TODO[SCAFFOLD]: delegate to ProposalUseCase
        throw new UnsupportedOperationException("approve not implemented");
    }

    @PutMapping("/reject")
    @PreAuthorize("hasAuthority('trn.proposal.reject')")
    @AuditAction("UPDATE_PROPOSAL")
    public ResponseEntity<Void> reject() {
        // TODO[SCAFFOLD]: delegate to ProposalUseCase
        throw new UnsupportedOperationException("reject not implemented");
    }
}
