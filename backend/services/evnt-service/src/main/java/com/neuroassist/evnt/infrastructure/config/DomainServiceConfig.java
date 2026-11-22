package com.neuroassist.evnt.infrastructure.config;

import com.neuroassist.evnt.domain.service.EventDomainService;
import com.neuroassist.evnt.domain.service.PushSubscriptionDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public EventDomainService eventDomainService() {
        return new EventDomainService();
    }

    @Bean
    public PushSubscriptionDomainService pushSubscriptionDomainService() {
        return new PushSubscriptionDomainService();
    }
}
