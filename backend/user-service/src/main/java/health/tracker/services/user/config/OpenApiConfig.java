package health.tracker.services.user.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI userServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("👤 User Service API")
                        .description("""
                                User profile & health metrics service.
                                
                                **Chức năng:**
                                - Quản lý hồ sơ sức khỏe (chiều cao, cân nặng, mục tiêu)
                                - Theo dõi chỉ số cơ thể theo thời gian (BMI, body fat, muscle mass)
                                - Log lượng nước uống hàng ngày
                                - Cài đặt thông báo nhắc nhở
                                
                                **Auth:** JWT Bearer token (lấy từ Auth Service)
                                """)
                        .version("1.0.0"))
                .addServersItem(new Server()
                        .url("http://localhost:8080")
                        .description("API Gateway (Local)"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT token từ POST /api/auth/login")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}

