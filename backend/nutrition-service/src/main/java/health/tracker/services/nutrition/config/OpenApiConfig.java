package health.tracker.services.nutrition.config;

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
    public OpenAPI nutritionServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("🍎 Nutrition Service API")
                        .description("""
                                Food database & nutrition information service.
                                
                                **Chức năng:**
                                - Kho dữ liệu thực phẩm (17+ thực phẩm Việt Nam có sẵn)
                                - Thông tin dinh dưỡng đầy đủ (calories, protein, carbs, fat, fiber...)
                                - Tìm kiếm thực phẩm (FULLTEXT search)
                                - Tra cứu theo mã vạch
                                - 14 danh mục thực phẩm
                                - Công thức nấu ăn (Recipes)
                                
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

