package health.tracker.services.auth.security.oauth2;

import health.tracker.services.auth.security.JwtUtil;
import health.tracker.services.auth.security.UserPrincipal;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;

    @Value("${app.oauth2.authorized-redirect-uri}")
    private String authorizedRedirectUri;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        String accessToken  = jwtUtil.generateAccessToken(userPrincipal);
        String refreshToken = jwtUtil.generateRefreshToken(userPrincipal);

        log.info("OAuth2 login success for user: {}", userPrincipal.getEmail());

        String redirectUrl = UriComponentsBuilder.fromUriString(authorizedRedirectUri)
                .queryParam("token", accessToken)
                .queryParam("refresh", refreshToken)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}

