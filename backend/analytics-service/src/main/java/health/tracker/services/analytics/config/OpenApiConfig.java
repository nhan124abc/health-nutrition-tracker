package health.tracker.services.analytics.config;

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
    public OpenAPI analyticsServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("📊 Analytics Service API")
                        .description("""
                                Health analytics, reports & insights service.
                                
                                **Chức năng:**
                                - Tóm tắt ngày: calo nạp vào/đốt, macro, nước, bước chân
                                - Báo cáo tuần & tháng tự động
                                - Xu hướng thực phẩm (thống kê món ăn thường xuyên)
                                - Streak tracking: chuỗi ngày đạt mục tiêu (logging, goal, activity streak)
                                - Health insights: gợi ý sức khỏe cá nhân hoá
                                - Admin: tổng quan toàn hệ thống (yêu cầu role ADMIN)
                                
                                **Data source:** Nhận Kafka events từ Meal Service & Activity Service.
                                
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

