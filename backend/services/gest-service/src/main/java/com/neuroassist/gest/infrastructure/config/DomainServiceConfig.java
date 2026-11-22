package com.neuroassist.gest.infrastructure.config;

import com.neuroassist.gest.domain.service.EngineCapabilityDomainService;
import com.neuroassist.gest.domain.service.EngineVersionDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public EngineVersionDomainService engineVersionDomainService() {
        return new EngineVersionDomainService();
    }

    @Bean
    public EngineCapabilityDomainService engineCapabilityDomainService() {
        return new EngineCapabilityDomainService();
    }
}
