package com.neuroassist.acs.infrastructure.config;

import com.neuroassist.acs.domain.service.CaregiverDomainService;
import com.neuroassist.acs.domain.service.JwtBlacklistDomainService;
import com.neuroassist.acs.domain.service.PatientSessionDomainService;
import com.neuroassist.acs.domain.service.TenantDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public TenantDomainService tenantDomainService() {
        return new TenantDomainService();
    }

    @Bean
    public CaregiverDomainService caregiverDomainService() {
        return new CaregiverDomainService();
    }

    @Bean
    public PatientSessionDomainService patientSessionDomainService() {
        return new PatientSessionDomainService();
    }

    @Bean
    public JwtBlacklistDomainService jwtBlacklistDomainService() {
        return new JwtBlacklistDomainService();
    }
}
