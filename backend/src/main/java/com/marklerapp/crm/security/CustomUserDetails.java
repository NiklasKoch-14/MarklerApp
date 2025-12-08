package com.marklerapp.crm.security;

import com.marklerapp.crm.entity.Agent;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Custom UserDetails implementation wrapping Agent entity.
 */
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails {

    private final Agent agent;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_AGENT"));
    }

    @Override
    public String getPassword() {
        return agent.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return agent.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return agent.isActive();
    }

    /**
     * Get the underlying Agent entity
     */
    public Agent getAgent() {
        return agent;
    }
}