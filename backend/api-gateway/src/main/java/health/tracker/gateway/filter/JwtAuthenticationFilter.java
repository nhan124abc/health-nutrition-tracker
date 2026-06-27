package health.tracker.gateway.filter;

import health.tracker.gateway.util.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Global JWT authentication filter.
 * Runs before all other gateway filters (order = -1).
 *
 * <p>For every request that is NOT on the public-path allow-list, it:
 * <ol>
 *   <li>Checks for a valid {@code Authorization: Bearer <token>} header.</li>
 *   <li>Validates the JWT (signature + expiry).</li>
 *   <li>Injects {@code X-User-Id}, {@code X-User-Name}, and {@code X-User-Role}
 *       headers so downstream services can trust the caller identity.</li>
 *   <li>Restricts admin endpoints to {@code ADMIN} role only.</li>
 * </ol>
 *
 * <p>Services and their base paths:
 * <ul>
 *   <li>auth-service      → /api/auth/**</li>
 *   <li>user-service      → /api/users/**</li>
 *   <li>nutrition-service → /api/nutrition/**</li>
 *   <li>meal-service      → /api/meals/**</li>
 *   <li>activity-service  → /api/activities/**</li>
 *   <li>analytics-service → /api/analytics/**</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtUtil jwtUtil;

    /**
     * Internal secret injected into every request forwarded to downstream services.
     * Downstream services validate this header to reject requests not coming through the gateway.
     */
    @Value("${internal.secret}")
    private String internalSecret;

    /** Paths accessible without a JWT token. */
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/api/v1/auth/password/forgot",
            "/api/v1/auth/password/verify-otp",
            "/api/v1/auth/password/reset",
            "/api/v1/auth/email/verification",
            "/api/v1/auth/oauth2",
            "/api/v1/auth/avatars/",
            "/api/v1/nutrition/categories",
            "/actuator",
            // Swagger UI & OpenAPI docs (aggregated at gateway)
            "/swagger-ui",
            "/swagger-ui.html",
            "/v3/api-docs",
            "/webjars"
    );

    /** Paths restricted to ADMIN role only. */
    private static final List<String> ADMIN_PATHS = List.of(
            "/api/v1/auth/admin",
            "/api/v1/analytics/admin",
            "/api/v1/users/admin",
            "/api/v1/nutrition/admin"
    );

    private static final List<String> OPTIONAL_AUTH_PATHS = List.of(
            "/api/v1/ai"
    );

    // -------------------------------------------------------------------------
    // GlobalFilter
    // -------------------------------------------------------------------------

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // Always let pre-flight CORS requests pass through
        if (HttpMethod.OPTIONS.equals(request.getMethod())) {
            return chain.filter(exchange);
        }

        String path = request.getPath().value();

        // Skip authentication for public endpoints
        if (isPublicPath(path)) {
            // Vẫn thêm X-Internal-Secret cho public paths (auth-service cần validate)
            ServerHttpRequest publicRequest = request.mutate()
                    .headers(this::removeTrustedHeaders)
                    .header("X-Internal-Secret", internalSecret)
                    .build();
            return chain.filter(exchange.mutate().request(publicRequest).build());
        }

        boolean optionalAuth = isOptionalAuthPath(path);

        // Require Authorization header
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            if (optionalAuth) {
                ServerHttpRequest guestRequest = request.mutate()
                        .headers(this::removeTrustedHeaders)
                        .header("X-Internal-Secret", internalSecret)
                        .build();
                return chain.filter(exchange.mutate().request(guestRequest).build());
            }

            log.warn("Missing or invalid Authorization header for path: {}", path);
            return onUnauthorized(exchange, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);

        // Validate token
        if (!jwtUtil.validateToken(token)) {
            log.warn("Invalid / expired JWT token for path: {}", path);
            return onUnauthorized(exchange, "Invalid or expired JWT token");
        }

        // Extract claims and forward identity headers to downstream services
        Claims claims = jwtUtil.extractAllClaims(token);
        String username = claims.getSubject();
        String userId   = claims.get("userId", String.class);
        String role     = claims.get("role",   String.class);

        log.debug("Authenticated request – user: {}, role: {}, path: {}", username, role, path);

        // Role-based access: ADMIN-only paths
        if (isAdminPath(path) && !"ADMIN".equalsIgnoreCase(role)) {
            log.warn("Forbidden – user: {} (role: {}) tried to access admin path: {}", username, role, path);
            return onForbidden(exchange, "Access denied: insufficient permissions");
        }

        ServerHttpRequest mutatedRequest = request.mutate()
                .headers(this::removeTrustedHeaders)
                .header("X-User-Id",         userId   != null ? userId   : "")
                .header("X-User-Name",       username != null ? username : "")
                .header("X-User-Role",       role     != null ? role     : "")
                .header("X-Internal-Secret", internalSecret)   // ← service sẽ validate header này
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return -1; // Run before all other filters
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    private boolean isAdminPath(String path) {
        return ADMIN_PATHS.stream().anyMatch(path::startsWith);
    }

    private boolean isOptionalAuthPath(String path) {
        return OPTIONAL_AUTH_PATHS.stream().anyMatch(path::startsWith);
    }

    private void removeTrustedHeaders(HttpHeaders headers) {
        headers.remove("X-User-Id");
        headers.remove("X-User-Name");
        headers.remove("X-User-Role");
        headers.remove("X-Internal-Secret");
        headers.remove("X-Forwarded-User");
    }

    private Mono<Void> onUnauthorized(ServerWebExchange exchange, String message) {
        return onError(exchange, message, HttpStatus.UNAUTHORIZED);
    }

    private Mono<Void> onForbidden(ServerWebExchange exchange, String message) {
        return onError(exchange, message, HttpStatus.FORBIDDEN);
    }

    private Mono<Void> onError(ServerWebExchange exchange, String message, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = String.format(
                "{\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
                status.value(),
                status.getReasonPhrase(),
                message,
                exchange.getRequest().getPath().value()
        );

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        var buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}

