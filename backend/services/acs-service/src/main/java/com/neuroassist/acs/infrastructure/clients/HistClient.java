package com.neuroassist.acs.infrastructure.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "hist-service", url = "${neuroassist.hist.base-url}")
public interface HistClient {

    // TODO[SCAFFOLD]: add methods from techlab-ai-integration.md
}
