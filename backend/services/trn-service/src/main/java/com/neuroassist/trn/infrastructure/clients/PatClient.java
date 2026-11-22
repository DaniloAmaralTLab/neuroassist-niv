package com.neuroassist.trn.infrastructure.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "pat-service", url = "${neuroassist.pat.base-url}")
public interface PatClient {

    // TODO[SCAFFOLD]: add methods from techlab-ai-integration.md
}
