package server.api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import server.api.model.User;
import server.api.repository.UserRepository;

import javax.servlet.http.HttpServletRequest;
import java.util.Date;
import java.util.Optional;

import static com.auth0.jwt.algorithms.Algorithm.HMAC512;


@Component
public class JWTUtils {

  private final long EXPIRATION_TIME = 86_400_000; // 1 day
  private final String secret;
  private CustomUserDetailsService userDetailsService;
  private UserRepository userRepository;

  public JWTUtils(Environment env, CustomUserDetailsService userDetailsService, UserRepository userRepository) {
    this.userDetailsService = userDetailsService;
    this.userRepository = userRepository;
    this.secret = env.getProperty("security.jwt.token.secret");
  }

  public String createJWT(String username, long expirationTime) {
    String token =  JWT.create()
      .withSubject(username)
      .withExpiresAt(new Date(System.currentTimeMillis() + expirationTime))
      .sign(HMAC512(secret.getBytes()));

    User user = this.userRepository.findByUsername(username).get();
    user.setToken(token);
    userRepository.save(user);
    return token;
  }

  public Authentication getAuthentication(String token) {
    UserDetails userDetails = this.userDetailsService.loadUserByUsername(getUsernameFromJWT(token));
    return new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
  }

  public String getUsernameFromJWT(String token) {
    return JWT.decode(token).getSubject();
  }

  public boolean validateJWT(String token) {
    try {
      DecodedJWT jwt = JWT.require(Algorithm.HMAC512(secret.getBytes())).build().verify(token);

      // Check if the JWT is set for the user as the active token
      Optional<User> userOpt = this.userRepository.findByUsername(getUsernameFromJWT(token));

      if (userOpt.isEmpty()) {
        return false;
      }
      User user = userOpt.get();
      if (!token.equals(user.getToken())) {
        return false;
      }

      return true;
    } catch (JWTVerificationException e) {
      return false;
    }
  }

  public String getTokenFromHeader(HttpServletRequest req) {
    String bearerToken = req.getHeader("Authorization");
    if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
      return bearerToken.substring(7);
    }
    return null;
  }
}
