package health.tracker.services.activity.config;

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
    public OpenAPI activityServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("🏃 Activity Service API")
                        .description("""
                                Physical activity tracking & workout planning service.
                                
                                **Chức năng:**
                                - Nhật ký vận động (20 loại hoạt động: chạy bộ, đạp xe, bơi lội, tập tạ...)
                                - Tính calo đốt tự động theo MET value
                                - Kế hoạch tập luyện theo tuần (Weight Loss / Muscle Gain / Endurance)
                                - Theo dõi số bước chân hàng ngày
                                - Hỗ trợ nhập từ thiết bị (Fitbit, Apple Health, Google Fit)
                                
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

