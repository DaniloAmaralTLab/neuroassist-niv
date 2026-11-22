package com.neuroassist.trn.infrastructure.config;

import com.neuroassist.trn.domain.service.ConsentRecordDomainService;
import com.neuroassist.trn.domain.service.PublicationDomainService;
import com.neuroassist.trn.domain.service.TrainingSessionDomainService;
import com.neuroassist.trn.domain.service.VoiceModelDomainService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainServiceConfig {

    @Bean
    public TrainingSessionDomainService trainingSessionDomainService() {
        return new TrainingSessionDomainService();
    }

    @Bean
    public ConsentRecordDomainService consentRecordDomainService() {
        return new ConsentRecordDomainService();
    }

    @Bean
    public VoiceModelDomainService voiceModelDomainService() {
        return new VoiceModelDomainService();
    }

    @Bean
    public PublicationDomainService publicationDomainService() {
        return new PublicationDomainService();
    }
}
