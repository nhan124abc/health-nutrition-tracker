package health.tracker.services.meal.config;

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
    public OpenAPI mealServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("🍽️ Meal Service API")
                        .description("""
                                Meal logging & meal planning service.
                                
                                **Chức năng:**
                                - Nhật ký bữa ăn hàng ngày (6 loại: Sáng, Snack sáng, Trưa, Snack chiều, Tối, Snack tối)
                                - Thêm thực phẩm/công thức từ Nutrition Service vào bữa ăn
                                - Tính tổng calo & macro tự động
                                - Kế hoạch ăn uống (tuần/tháng)
                                - Danh sách thực phẩm yêu thích
                                - Publish Kafka event sau mỗi bữa ăn → Analytics Service cập nhật
                                
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

