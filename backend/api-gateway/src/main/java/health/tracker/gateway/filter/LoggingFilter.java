package health.tracker.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

/**
 * Global logging filter.
 *
 * <p>For every request it:
 * <ul>
 *   <li>Generates (or reuses) a {@code X-Request-Id} correlation header.</li>
 *   <li>Puts {@code requestId} and {@code userId} into the SLF4J MDC so that
 *       every log line emitted during the request carries these fields
 *       (see the {@code %X{requestId}} token in {@code logback-spring.xml}).</li>
 *   <li>Logs request entry and response exit with elapsed time.</li>
 * </ul>
 * Runs after {@link JwtAuthenticationFilter} (order = 0).
 */
@Slf4j
@Component
public class LoggingFilter implements GlobalFilter, Ordered {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String MDC_REQUEST_ID    = "requestId";
    private static final String MDC_USER_ID       = "userId";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // Reuse existing correlation ID or generate a new one
        String requestId = request.getHeaders().getFirst(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        // Forward the correlation ID to downstream services
        final String finalRequestId = requestId;
        ServerHttpRequest mutatedRequest = request.mutate()
                .header(REQUEST_ID_HEADER, finalRequestId)
                .build();

        final long startTime = Instant.now().toEpochMilli();

        // userId may have been injected by JwtAuthenticationFilter already
        final String userId = request.getHeaders().getFirst("X-User-Id");

        // Set MDC for the current (event-loop) thread before logging
        MDC.put(MDC_REQUEST_ID, finalRequestId);
        if (userId != null && !userId.isBlank()) {
            MDC.put(MDC_USER_ID, userId);
        }

        log.info("--> {} {}", request.getMethod(), request.getURI());

        MDC.remove(MDC_REQUEST_ID);
        MDC.remove(MDC_USER_ID);

        return chain.filter(exchange.mutate().request(mutatedRequest).build())
                .then(Mono.fromRunnable(() -> {
                    // Restore MDC on completion (may run on a different thread)
                    MDC.put(MDC_REQUEST_ID, finalRequestId);
                    if (userId != null && !userId.isBlank()) {
                        MDC.put(MDC_USER_ID, userId);
                    }

                    ServerHttpResponse response = exchange.getResponse();
                    long elapsed = Instant.now().toEpochMilli() - startTime;

                    log.info("<-- {} {} | status: {} | {}ms",
                            request.getMethod(),
                            request.getURI(),
                            response.getStatusCode(),
                            elapsed);

                    MDC.remove(MDC_REQUEST_ID);
                    MDC.remove(MDC_USER_ID);
                }));
    }

    @Override
    public int getOrder() {
        return 0;
    }
}
