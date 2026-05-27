package health.tracker.services.ai.service;

import health.tracker.services.ai.dto.ChatRequest;
import health.tracker.services.ai.dto.ChatResponse;
import health.tracker.services.ai.exception.AppException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AiChatService {

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;
    private final String model;

    public AiChatService(
            ObjectProvider<ChatClient.Builder> chatClientBuilderProvider,
            @Value("${spring.ai.openai.chat.options.model:llama-3.1-8b-instant}") String model) {
        this.chatClientBuilderProvider = chatClientBuilderProvider;
        this.model = model;
    }

    public ChatResponse chat(String userId, String username, ChatRequest request) {
        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();

        if (builder == null) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "AI model is not configured");
        }

        String systemPrompt = """
                You are the AI assistant inside Health Nutrition Tracker.
                Give concise, practical answers about nutrition, activity, body metrics, and app usage.
                Do not provide medical diagnosis. Encourage users to consult a healthcare professional for medical concerns.
                """;

        String userPrompt = """
                User id: %s
                Username/email: %s
                Optional app context: %s

                User message:
                %s
                """.formatted(
                userId,
                username == null || username.isBlank() ? "unknown" : username,
                request.getContext() == null || request.getContext().isBlank() ? "none" : request.getContext(),
                request.getMessage()
        );

        String reply = builder
                .defaultSystem(systemPrompt)
                .build()
                .prompt()
                .user(userPrompt)
                .call()
                .content();

        return ChatResponse.builder()
                .reply(reply)
                .model(model)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
