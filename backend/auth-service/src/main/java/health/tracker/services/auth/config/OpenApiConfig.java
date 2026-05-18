package health.tracker.services.auth.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SpringDoc OpenAPI configuration for Auth Service.
 * API docs accessible via API Gateway at: http://localhost:8080/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI authServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("🔐 Auth Service API")
                        .description("""
                                Authentication & Authorization service.
                                
                                **Chức năng:**
                                - Đăng ký / Đăng nhập (Email + Password)
                                - JWT Access Token (1 ngày) + Refresh Token (7 ngày)
                                - OAuth2 Social Login (Google, Facebook)
                                - Brute-force protection (Redis)
                                - OTP Reset Password
                                - Login Audit Log
                                
                                **Lưu ý:** Tất cả requests đều đi qua API Gateway tại port 8080.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Health Nutrition Tracker")
                                .email("dev@healthtracker.com")))
                // Server URL — trỏ về gateway (requests đi qua gateway)
                .addServersItem(new Server()
                        .url("http://localhost:8080")
                        .description("API Gateway (Local)"))
                // JWT Bearer Auth scheme
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT token. Lấy token từ POST /api/auth/login")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}

