package health.tracker.services.activity;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "management.health.redis.enabled=false",
        "spring.kafka.listener.auto-startup=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class ActivityServiceApplicationTests {

    @MockitoBean
    private LettuceConnectionFactory redisConnectionFactory;

    @Test
    void contextLoads() {
    }

}
