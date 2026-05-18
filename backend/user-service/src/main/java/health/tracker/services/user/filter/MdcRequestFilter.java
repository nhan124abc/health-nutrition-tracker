package health.tracker.services.user.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Servlet filter chạy một lần mỗi request.
 * Đặt MDC keys để mọi log trong request đều có context:
 * - requestId : UUID ngẫu nhiên (hoặc lấy từ X-Request-Id header nếu có)
 * - userId    : lấy từ X-User-Id header (được inject bởi API Gateway)
 */
@Component
public class MdcRequestFilter extends OncePerRequestFilter {

    private static final String HEADER_REQUEST_ID = "X-Request-Id";
    private static final String HEADER_USER_ID    = "X-User-Id";
    private static final String MDC_REQUEST_ID    = "requestId";
    private static final String MDC_USER_ID       = "userId";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest  request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain         chain
    ) throws ServletException, IOException {

        String requestId = request.getHeader(HEADER_REQUEST_ID);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }

        String userId = request.getHeader(HEADER_USER_ID);

        try {
            MDC.put(MDC_REQUEST_ID, requestId);
            if (userId != null && !userId.isBlank()) {
                MDC.put(MDC_USER_ID, userId);
            }

            // Trả requestId về client để dễ trace
            response.setHeader(HEADER_REQUEST_ID, requestId);
            chain.doFilter(request, response);

        } finally {
            // Luôn clear MDC sau request để tránh leak giữa các thread
            MDC.remove(MDC_REQUEST_ID);
            MDC.remove(MDC_USER_ID);
        }
    }
}

