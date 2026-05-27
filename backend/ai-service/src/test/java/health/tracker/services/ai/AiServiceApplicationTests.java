package health.tracker.services.ai;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.ai.model.chat=none",
        "spring.ai.openai.api-key=test-key"
})
class AiServiceApplicationTests {

    @Test
    void contextLoads() {
    }
}
