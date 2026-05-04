package com.example.do_an.controller;

import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiNutritionController {

    // Thay vì ChatClient, ta dùng trực tiếp Model để tránh lỗi mapping 404
    private final GoogleGenAiChatModel chatModel;

    public AiNutritionController(GoogleGenAiChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @GetMapping("/consult")
    public String getNutritionAdvice(
            @RequestParam(value = "message", defaultValue = "Hãy gợi ý thực đơn cho người muốn tăng cơ") String message) {
        // Sử dụng phương thức call trực tiếp từ model
        return chatModel.call(message);
    }

    @GetMapping("/plan")
    public String generateMealPlan(@RequestParam double bmi, @RequestParam String goal) {
        String userPrompt = String.format(
                "Tôi có chỉ số BMI là %.1f và mục tiêu là %s. " +
                        "Hãy lập thực đơn dinh dưỡng 1 ngày chi tiết (Sáng, Trưa, Chiều, Tối) bằng tiếng Việt.",
                bmi, goal);

        return chatModel.call(userPrompt);
    }
}