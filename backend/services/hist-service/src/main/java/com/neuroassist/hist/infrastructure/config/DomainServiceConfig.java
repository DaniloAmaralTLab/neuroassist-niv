package com.neuroassist.hist.infrastructure.config;

import com.neuroassist.hist.domain.service.AuditRecordDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public AuditRecordDomainService auditRecordDomainService() {
        return new AuditRecordDomainService();
    }
}
