package com.neuroassist.evnt.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "push_subscription")
// Schema resolvido via hibernate.default_schema por profile + TenantContextHolder em runtime
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PushSubscriptionJpaEntity {

    @Id
    @GeneratedValue
    @Column(name = "push_subscription_id")
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // TODO[SCAFFOLD]: complete fields from data-model.md
}
