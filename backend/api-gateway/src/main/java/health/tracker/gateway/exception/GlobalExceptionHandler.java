package health.tracker.gateway.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

/**
 * Global exception handler for the reactive gateway.
 *
 * <p>Catches uncaught exceptions that propagate past the filter chain and returns
 * a uniform JSON error response instead of Spring's default white-label error page.</p>
 */
@Slf4j
@Order(-2) // Must run before DefaultErrorWebExceptionHandler (order = -1)
@Component
public class GlobalExceptionHandler implements ErrorWebExceptionHandler {

    @Override
    @NonNull
    public Mono<Void> handle(@NonNull ServerWebExchange exchange, @NonNull Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();

        HttpStatus status = resolveStatus(ex);
        String message = resolveMessage(ex, status);

        log.error("Gateway error [{} {}]: {}",
                exchange.getRequest().getMethod(),
                exchange.getRequest().getPath(),
                ex.getMessage(),
                ex);

        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = String.format(
                "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                sanitize(message),
                exchange.getRequest().getPath().value()
        );

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        var buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private HttpStatus resolveStatus(Throwable ex) {
        if (ex instanceof ResponseStatusException rse) {
            // NotFoundException (SERVICE_UNAVAILABLE) is a subtype of ResponseStatusException
            return HttpStatus.resolve(rse.getStatusCode().value()) != null
                    ? HttpStatus.valueOf(rse.getStatusCode().value())
                    : HttpStatus.INTERNAL_SERVER_ERROR;
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private String resolveMessage(Throwable ex, HttpStatus status) {
        if (ex instanceof ResponseStatusException rse) {
            if (rse.getReason() != null) return rse.getReason();
            if (status == HttpStatus.SERVICE_UNAVAILABLE) {
                return "The requested service is currently unavailable. Please try again later.";
            }
        }
        if (status == HttpStatus.INTERNAL_SERVER_ERROR) {
            return "An unexpected error occurred. Please contact support if the issue persists.";
        }
        return ex.getMessage() != null ? ex.getMessage() : status.getReasonPhrase();
    }

    /** Removes characters that could break JSON string literals. */
    private String sanitize(String input) {
        if (input == null) return "";
        return input.replace("\"", "'").replace("\n", " ").replace("\r", "");
    }
}




