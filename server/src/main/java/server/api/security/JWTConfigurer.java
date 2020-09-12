package server.api.security;

import org.springframework.security.config.annotation.SecurityConfigurerAdapter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


public class JWTConfigurer extends SecurityConfigurerAdapter<DefaultSecurityFilterChain, HttpSecurity> {
  private final JWTUtils jwtUtils;

  public JWTConfigurer(JWTUtils jwtUtils) {
    this.jwtUtils = jwtUtils;
  }

  @Override
  public void configure(HttpSecurity http) {
    http.addFilterBefore(new JWTFilter(jwtUtils), UsernamePasswordAuthenticationFilter.class);
  }
}
