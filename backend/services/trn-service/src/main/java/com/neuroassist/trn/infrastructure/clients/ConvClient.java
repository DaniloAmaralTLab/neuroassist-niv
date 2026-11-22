package com.neuroassist.trn.infrastructure.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "conv-service", url = "${neuroassist.conv.base-url}")
public interface ConvClient {

    // TODO[SCAFFOLD]: add methods from techlab-ai-integration.md
}
