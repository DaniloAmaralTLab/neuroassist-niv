package com.neuroassist.pat.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "command")
// Schema resolvido via hibernate.default_schema por profile + TenantContextHolder em runtime
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommandJpaEntity {

    @Id
    @GeneratedValue
    @Column(name = "command_id")
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // TODO[SCAFFOLD]: complete fields from data-model.md
}
