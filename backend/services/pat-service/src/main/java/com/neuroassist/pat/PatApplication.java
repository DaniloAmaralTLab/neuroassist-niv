package com.neuroassist.pat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication
public class PatApplication {

    public static void main(String[] args) {
        SpringApplication.run(PatApplication.class, args);
    }
}
