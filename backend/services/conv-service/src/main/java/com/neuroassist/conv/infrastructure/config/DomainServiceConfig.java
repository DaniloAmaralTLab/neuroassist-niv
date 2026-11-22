package com.neuroassist.conv.infrastructure.config;

import com.neuroassist.conv.domain.service.PublishedTreeDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public PublishedTreeDomainService publishedTreeDomainService() {
        return new PublishedTreeDomainService();
    }
}
