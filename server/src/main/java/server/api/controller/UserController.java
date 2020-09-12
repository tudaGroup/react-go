package server.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import server.api.dto.UserDTO;
import server.api.model.User;
import server.api.repository.GameRepository;
import server.api.repository.UserRepository;
import server.api.security.JWTUtils;

import javax.mail.MessagingException;
import javax.mail.internet.MimeMessage;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;


@RestController
@RequestMapping("/users")
public class UserController {
  private final UserRepository userRepository;
  private final GameRepository gameRepository;
  private final BCryptPasswordEncoder bCryptPasswordEncoder;
  private final JWTUtils jwtUtils;
  private final JavaMailSender mailSender;

  public UserController(UserRepository userRepository, GameRepository gameRepository, BCryptPasswordEncoder bCryptPasswordEncoder, JWTUtils jwtUtils, JavaMailSender mailSender) {
    this.userRepository = userRepository;
    this.gameRepository = gameRepository;
    this.bCryptPasswordEncoder = bCryptPasswordEncoder;
    this.jwtUtils = jwtUtils;
    this.mailSender = mailSender;
  }

  @PostMapping
  public ResponseEntity<String> register(@RequestBody User user) {
    // Check if username or email already exists
    if (!userRepository.findByUsernameOrEmail(user.getUsername(), user.getEmail()).isEmpty()) {
      return new ResponseEntity<>("Username or email already taken", HttpStatus.BAD_REQUEST);
    }

    user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
    userRepository.save(user);
    return new ResponseEntity<>(jwtUtils.createJWT(user.getUsername(), 86_400_000), HttpStatus.CREATED);
  }

  @PostMapping("/login")
  public ResponseEntity<String> login(@RequestBody User user) {
    Optional<User> userData = userRepository.findByUsername(user.getUsername());
    if (userData.isPresent() && bCryptPasswordEncoder.matches(user.getPassword(), userData.get().getPassword())) {
      return new ResponseEntity<>(jwtUtils.createJWT(user.getUsername(), 86_400_000), HttpStatus.OK);
    } else {
      return new ResponseEntity<>("Wrong username or password", HttpStatus.BAD_REQUEST);
    }
  }

  @GetMapping("/logout")
  public String logout() {
    User user = ((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    user.setToken(null); // Invalidate currently active token
    userRepository.save(user);
    return "User successfully logged out.";
  }

  @GetMapping("/me")
  public UserDTO getCurrentUserInfo() {
    User user = ((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    return new UserDTO(user, gameRepository);
  }

  @PatchMapping("/me")
  public UserDTO updateCurrentUserInfo(@RequestBody JsonNode updates) {
    User user = ((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());

    if (updates.has("email")) {
      user.setEmail(updates.get("email").asText());
    }
    if (updates.has("password")) {
      user.setPassword((updates.get("password").asText()));
    }
    if (updates.has("country")) {
      user.setCountry(updates.get("country").asText());
    }
    if (updates.has("location")) {
      user.setLocation(updates.get("location").asText());
    }
    if (updates.has("biography")) {
      user.setBiography(updates.get("biography").asText());
    }
    if (updates.has("givenName")) {
      user.setGivenName(updates.get("givenName").asText());
    }
    if (updates.has("surName")) {
      user.setSurName(updates.get("surName").asText());
    }
    userRepository.save(user);
    return new UserDTO(user, gameRepository);
  }

  @GetMapping("/{name}")
  private ResponseEntity<UserDTO> getUserInfo(@PathVariable String name) {
    Optional<User> userOptional = userRepository.findByUsername(name);
    if (userOptional.isEmpty()) {
      return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    return new ResponseEntity<>(new UserDTO(userOptional.get(), gameRepository), HttpStatus.OK);
  }

  @PostMapping("/resetpassword")
  private ResponseEntity<String> forgotPassword(@RequestBody JsonNode data) throws MessagingException {
    String email = data.get("email").asText();
    Optional<User> userOptional = userRepository.findByEmail(email);
    if (userOptional.isEmpty()) {
      return new ResponseEntity<>("USER_NOT_FOUND", HttpStatus.NO_CONTENT);
    }

    String token = jwtUtils.createJWT(userOptional.get().getUsername(), 1800000); // valid for 30 minutes

    MimeMessage mimeMessage = mailSender.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
    String htmlMsg = "Please follow this link to reset your password: <br/>" +
      "<a href=\"http://localhost:3000/resetpassword/" + token + "\">Click here</a>";
    helper.setText(htmlMsg, true);
    helper.setTo(email);
    helper.setSubject("Go Game: Password Reset");
    mailSender.send(mimeMessage);

    return new ResponseEntity<>("SUCCESS", HttpStatus.OK);
  }

  @GetMapping("/resetpassword/{token}")
  private ResponseEntity<Map<String, String>> resetPassword(@PathVariable String token) {
    if (jwtUtils.validateJWT(token)) {
      User user = userRepository.findByUsername(jwtUtils.getUsernameFromJWT(token)).get();

      Map<String, String> response = new HashMap<>();
      response.put("username", user.getUsername());
      response.put("token", token);
      return new ResponseEntity<>(response, HttpStatus.CREATED);
    } else {
      return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
    }
  }

  @PatchMapping("/resetpassword")
  private ResponseEntity<String> setNewPassword(@RequestBody JsonNode data) {
    String username = data.get("username").asText();
    Optional<User> userOptional = userRepository.findByUsername(username);
    User user = userOptional.get();
    String hashedPassword = bCryptPasswordEncoder.encode(data.get("password").asText());
    user.setPassword(hashedPassword);
    userRepository.save(user);


    return new ResponseEntity<>("Password updated", HttpStatus.CREATED);
  }
}
