package health.tracker.services.auth.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Đặt MDC keys cho mỗi request:
 * - requestId : UUID (hoặc X-Request-Id header nếu có từ Gateway)
 * Auth service không nhận X-User-Id vì đây là entry point xác thực.
 */
@Slf4j
@Component
@Order(1)
public class MdcRequestFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest  request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain         chain
    ) throws ServletException, IOException {

        String requestId = request.getHeader("X-Request-Id");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }

        try {
            MDC.put("requestId", requestId);
            response.setHeader("X-Request-Id", requestId);

            long start = System.currentTimeMillis();
            chain.doFilter(request, response);
            long elapsed = System.currentTimeMillis() - start;

            log.debug("{} {} → {} ({}ms)",
                    request.getMethod(), request.getRequestURI(),
                    response.getStatus(), elapsed);

        } finally {
            MDC.remove("requestId");
        }
    }
}

