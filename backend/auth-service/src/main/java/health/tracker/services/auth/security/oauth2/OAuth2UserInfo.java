package health.tracker.services.auth.security.oauth2;

public interface OAuth2UserInfo {
    String getId();
    String getName();
    String getEmail();
    String getAvatarUrl();
}

