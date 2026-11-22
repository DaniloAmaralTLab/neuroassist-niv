package com.neuroassist.edge.infrastructure.config;

import com.neuroassist.edge.domain.service.DevicePairingCodeDomainService;
import com.neuroassist.edge.domain.service.EdgeDeviceDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public DevicePairingCodeDomainService devicePairingCodeDomainService() {
        return new DevicePairingCodeDomainService();
    }

    @Bean
    public EdgeDeviceDomainService edgeDeviceDomainService() {
        return new EdgeDeviceDomainService();
    }
}
