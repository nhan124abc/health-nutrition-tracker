package health.tracker.services.user.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Security filter — chạy TRƯỚC mọi filter khác (Order = -2).
 *
 * <p>Validate {@code X-Internal-Secret} header để đảm bảo mọi request
 * đều đi qua API Gateway, không được gọi trực tiếp vào service.
 *
 * <p>Nếu {@code internal.secret} không được cấu hình (rỗng) →
 * bỏ qua kiểm tra (thuận tiện cho local dev).
 */
@Slf4j
@Component
@Order(-2)
public class InternalRequestFilter extends OncePerRequestFilter {

    private static final String HEADER_INTERNAL_SECRET = "X-Internal-Secret";

    @Value("${internal.secret:}")
    private String internalSecret;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return "/actuator/health".equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest  request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain         chain
    ) throws ServletException, IOException {

        if (internalSecret == null || internalSecret.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        String requestSecret = request.getHeader(HEADER_INTERNAL_SECRET);

        if (!internalSecret.equals(requestSecret)) {
            log.warn("Rejected request — missing or invalid X-Internal-Secret | uri={} | ip={}",
                    request.getRequestURI(), request.getRemoteAddr());
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Direct access to internal service is not allowed\"}"
            );
            return;
        }

        chain.doFilter(request, response);
    }
}

