package health.tracker.services.activity.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Đặt MDC keys + ghi request/response log ngắn gọn.
 */
@Slf4j
@Component
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
        String userId = request.getHeader("X-User-Id");

        try {
            MDC.put("requestId", requestId);
            if (userId != null && !userId.isBlank()) MDC.put("userId", userId);
            response.setHeader("X-Request-Id", requestId);

            long start = System.currentTimeMillis();
            chain.doFilter(request, response);
            long elapsed = System.currentTimeMillis() - start;

            log.debug("{} {} → {} ({}ms)",
                    request.getMethod(), request.getRequestURI(),
                    response.getStatus(), elapsed);

        } finally {
            MDC.remove("requestId");
            MDC.remove("userId");
        }
    }
}

