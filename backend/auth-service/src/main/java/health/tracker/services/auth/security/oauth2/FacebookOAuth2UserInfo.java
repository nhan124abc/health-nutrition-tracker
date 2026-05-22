package health.tracker.services.auth.security.oauth2;

import java.util.Map;

public class FacebookOAuth2UserInfo implements OAuth2UserInfo {

    private final Map<String, Object> attributes;

    public FacebookOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    @Override
    public String getId() {
        return (String) attributes.get("id");
    }

    @Override
    public String getName() {
        return (String) attributes.get("name");
    }

    @Override
    public String getEmail() {
        return (String) attributes.get("email");
    }

    @Override
    public String getAvatarUrl() {
        // Facebook: attributes.picture.data.url
        @SuppressWarnings("unchecked")
        Map<String, Object> picture = (Map<String, Object>) attributes.get("picture");
        if (picture != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) picture.get("data");
            if (data != null) return (String) data.get("url");
        }
        return null;
    }
}

