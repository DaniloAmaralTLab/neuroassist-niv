package com.neuroassist.evnt.infrastructure.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "edge-service", url = "${edge.base-url}")
public interface EdgeClient {

    // TODO[SCAFFOLD]: add methods from techlab-ai-integration.md
}
