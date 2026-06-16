package health.tracker.services.auth.security.oauth2;

import health.tracker.services.auth.entity.User;
import health.tracker.services.auth.repository.UserRepository;
import health.tracker.services.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        log.debug("OAuth2 login via: {}", registrationId);

        OAuth2UserInfo userInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(registrationId, attributes);
        User user = processOAuth2User(registrationId, userInfo);

        return UserPrincipal.create(user, attributes);
    }

    private User processOAuth2User(String registrationId, OAuth2UserInfo userInfo) {
        User.AuthProvider provider = User.AuthProvider.valueOf(registrationId.toUpperCase());
        String email = resolveEmail(provider, userInfo);

        return userRepository.findByProviderIdAndAuthProvider(userInfo.getId(), provider)
                .map(existing -> updateExistingUser(existing, userInfo))
                .orElseGet(() -> userRepository.findByEmail(email)
                        .map(existing -> handleExistingEmail(existing, provider, userInfo))
                        .orElseGet(() -> registerNewOAuth2User(provider, userInfo, email)));
    }

    private String resolveEmail(User.AuthProvider provider, OAuth2UserInfo userInfo) {
        if (StringUtils.hasText(userInfo.getEmail())) {
            return userInfo.getEmail();
        }

        if (!StringUtils.hasText(userInfo.getId())) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("provider_id_not_provided"),
                    "OAuth2 provider did not return an id"
            );
        }

        String fallbackEmail = provider.name().toLowerCase() + "_" + userInfo.getId() + "@oauth.local";
        log.warn("{} OAuth2 login did not return email. Using fallback email: {}", provider, fallbackEmail);
        return fallbackEmail;
    }

    private User handleExistingEmail(User user,
                                     User.AuthProvider provider,
                                     OAuth2UserInfo userInfo) {
        if (user.getAuthProvider() == User.AuthProvider.LOCAL) {
            log.info("Linking {} OAuth2 login to existing local user: {}", provider, user.getEmail());
            user.setAuthProvider(provider);
        } else if (user.getAuthProvider() != provider) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("email_already_registered"),
                    "Email is already registered with " + user.getAuthProvider()
            );
        }

        user.setProviderId(userInfo.getId());
        return updateExistingUser(user, userInfo);
    }

    private User registerNewOAuth2User(User.AuthProvider provider,
                                       OAuth2UserInfo userInfo,
                                       String email) {
        log.info("Registering new OAuth2 user: {}", email);
        User user = User.builder()
                .email(email)
                .fullName(userInfo.getName())
                .avatarUrl(userInfo.getAvatarUrl())
                .authProvider(provider)
                .providerId(userInfo.getId())
                .role(User.Role.USER)
                .emailVerified(true)
                .build();
        return userRepository.save(user);
    }

    private User updateExistingUser(User user, OAuth2UserInfo userInfo) {
        user.setFullName(userInfo.getName());
        user.setAvatarUrl(userInfo.getAvatarUrl());
        return userRepository.save(user);
    }
}

