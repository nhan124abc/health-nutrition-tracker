package health.tracker.services.auth.security;

import health.tracker.services.auth.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
public class UserPrincipal implements UserDetails, OAuth2User {

    private final Long id;
    private final String email;
    private final String password;
    private final boolean enabled;
    private final Collection<? extends GrantedAuthority> authorities;
    private Map<String, Object> attributes;

    public static UserPrincipal create(User user) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );
        return new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getPassword(),
                user.isActive(),
                authorities,
                null
        );
    }

    public static UserPrincipal create(User user, Map<String, Object> attributes) {
        UserPrincipal principal = create(user);
        principal.attributes = attributes;
        return principal;
    }

    // -------- UserDetails --------

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return enabled; }

    // -------- OAuth2User --------

    @Override
    public String getName() {
        return String.valueOf(id);
    }
}

