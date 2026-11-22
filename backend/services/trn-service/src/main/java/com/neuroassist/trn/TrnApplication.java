package com.neuroassist.trn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication
public class TrnApplication {

    public static void main(String[] args) {
        SpringApplication.run(TrnApplication.class, args);
    }
}
