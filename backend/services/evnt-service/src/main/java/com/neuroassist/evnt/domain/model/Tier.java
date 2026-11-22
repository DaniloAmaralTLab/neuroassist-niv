package com.neuroassist.evnt.domain.model;

/**
 * Out-of-band escalation tier (ADR-005 / SPEC-11). The ordinal matches the {@code
 * escalation_attempt.tier} smallint column (CHECK tier IN (0, 1, 2)): TIER_0 = Web Push, TIER_1 =
 * SMS, TIER_2 = voice call.
 */
public enum Tier {
    TIER_0,
    TIER_1,
    TIER_2
}
