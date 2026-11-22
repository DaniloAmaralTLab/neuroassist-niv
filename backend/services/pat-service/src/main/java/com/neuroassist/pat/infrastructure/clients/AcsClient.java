package com.neuroassist.pat.infrastructure.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "acs-service", url = "${acs.base-url}")
public interface AcsClient {

    // TODO[SCAFFOLD]: add methods from techlab-ai-integration.md
}
