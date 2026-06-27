package health.tracker.services.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {
    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:no-reply@health.local}")
    private String from;

    public void sendOtp(String email, String subject, String otp) {
        if (!enabled) {
            log.warn("Email delivery is disabled. Development OTP for {}: {}", email, otp);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(subject);
        message.setText("Your Health Nutrition verification code is " + otp
                + ". This code expires in 5 minutes.");
        try {
            mailSender.send(message);
            log.info("OTP email accepted by SMTP provider for: {}", email);
        } catch (MailException ex) {
            log.error("Failed to send OTP email to {}: {}", email, ex.getMessage(), ex);
            throw ex;
        }
    }

    public void sendReminder(String email, String subject, String body) {
        if (!enabled) {
            log.warn("Email delivery is disabled. Reminder for {}: {} - {}", email, subject, body);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
            log.info("Reminder email accepted by SMTP provider for: {}", email);
        } catch (MailException ex) {
            // Reminder delivery is best-effort and must not break the web notification flow.
            log.warn("Reminder email was not delivered to {}: {}", email, ex.getMessage());
        }
    }
}
