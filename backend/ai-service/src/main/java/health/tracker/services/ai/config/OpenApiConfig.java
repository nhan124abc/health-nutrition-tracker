package health.tracker.services.ai.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI aiOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Health Tracker AI Service API")
                        .version("v1")
                        .description("AI chat assistant service."));
    }
}
