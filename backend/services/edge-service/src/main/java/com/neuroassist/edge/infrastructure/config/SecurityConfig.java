package com.neuroassist.edge.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers("/actuator/health", "/actuator/prometheus")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/edge/devices/pair")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET, "/edge/.well-known/jwks.json")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, "/edge/health")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .oauth2ResourceServer(
                        oauth2 ->
                                oauth2.jwt(
                                        jwt ->
                                                jwt.jwtAuthenticationConverter(
                                                        jwtAuthenticationConverter())));
        return http.build();
    }

    /**
     * D-642: the access token carries its authorities in the `authorities` claim; map them verbatim
     * (no SCOPE_ prefix) so hasAuthority('module.resource.action') matches.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("authorities");
        authorities.setAuthorityPrefix("");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
}
