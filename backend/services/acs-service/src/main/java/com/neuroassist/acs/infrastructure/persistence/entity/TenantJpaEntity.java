package com.neuroassist.acs.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

/**
 * Global care-unit registry (data-model §2.1, schema `global`): {@code tenant(id, type, name,
 * created_at)}. The tenant row IS the tenant, so it carries no separate tenant_id column — the
 * scaffold had mapped `tenant_id` twice (id + a generic multi-tenant tenantId), which made every
 * Spring context fail with a Hibernate MappingException.
 */
@Entity
@Table(name = "tenant")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantJpaEntity {

    @Id
    @GeneratedValue
    @Column(name = "id")
    private UUID id;

    /** family | clinic (chk_tenant_type). */
    @Column(name = "type", nullable = false, length = 16)
    private String type;

    @Column(name = "name", nullable = false, length = 160)
    private String name;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
