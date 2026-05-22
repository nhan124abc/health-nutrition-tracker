package health.tracker.services.auth.security.oauth2;

import health.tracker.services.auth.entity.User;
import health.tracker.services.auth.repository.UserRepository;
import health.tracker.services.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

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

        return userRepository.findByProviderIdAndAuthProvider(userInfo.getId(), provider)
                .map(existing -> updateExistingUser(existing, userInfo))
                .orElseGet(() -> registerNewOAuth2User(provider, userInfo));
    }

    private User registerNewOAuth2User(User.AuthProvider provider, OAuth2UserInfo userInfo) {
        log.info("Registering new OAuth2 user: {}", userInfo.getEmail());
        User user = User.builder()
                .email(userInfo.getEmail())
                .fullName(userInfo.getName())
                .avatarUrl(userInfo.getAvatarUrl())
                .authProvider(provider)
                .providerId(userInfo.getId())
                .role(User.Role.USER)
                .build();
        return userRepository.save(user);
    }

    private User updateExistingUser(User user, OAuth2UserInfo userInfo) {
        user.setFullName(userInfo.getName());
        user.setAvatarUrl(userInfo.getAvatarUrl());
        return userRepository.save(user);
    }
}

