package com.neuroassist.gest.infrastructure.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "pat-service", url = "${pat.base-url}")
public interface PatGestureTypeClient {

    // TODO[SCAFFOLD]: add methods from techlab-ai-integration.md
}
