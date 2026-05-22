package health.tracker.services.nutrition;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {"management.health.redis.enabled=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class NutritionServiceApplicationTests {

    @MockitoBean
    private LettuceConnectionFactory redisConnectionFactory;

    @Test
    void contextLoads() {
    }

}
