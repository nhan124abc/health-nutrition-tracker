package health.tracker.services.user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration for User Service.
 *
 * <p>Authentication & Authorization are handled at the API Gateway level (JWT validation).
 * This service validates requests via {@link health.tracker.services.user.filter.InternalRequestFilter}
 * (X-Internal-Secret header) and trusts X-User-Id / X-User-Role headers set by the gateway.</p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // SpringDoc / Swagger
                    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                    // Actuator health check
                    .requestMatchers("/actuator/health").permitAll()
                    // All other requests validated by InternalRequestFilter
                    .anyRequest().permitAll()
            );

        return http.build();
    }
}

