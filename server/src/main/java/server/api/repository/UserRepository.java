package server.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import server.api.model.User;

import java.util.List;
import java.util.Optional;


public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByUsername(String username);

  Optional<User> findByEmail(String email);

  List<User> findByUsernameOrEmail(String username, String email);
}
