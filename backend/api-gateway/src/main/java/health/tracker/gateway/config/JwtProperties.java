package health.tracker.gateway.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds the {@code jwt.*} properties from application.yml.
 *
 * <pre>
 * jwt:
 *   secret: "..."
 *   expiration: 86400000
 *   refresh-expiration: 604800000
 * </pre>
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    /** HMAC-SHA256 signing secret (min 256 bits recommended). */
    private String secret;

    /** Access-token TTL in milliseconds (default: 1 day). */
    private long expiration = 86_400_000L;

    /** Refresh-token TTL in milliseconds (default: 7 days). */
    private long refreshExpiration = 604_800_000L;
}

