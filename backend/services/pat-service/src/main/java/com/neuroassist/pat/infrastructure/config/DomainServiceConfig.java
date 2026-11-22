package com.neuroassist.pat.infrastructure.config;

import com.neuroassist.pat.domain.service.GestureTypeDomainService;
import com.neuroassist.pat.domain.service.PatientDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public GestureTypeDomainService gestureTypeDomainService() {
        return new GestureTypeDomainService();
    }

    @Bean
    public PatientDomainService patientDomainService() {
        return new PatientDomainService();
    }
}
