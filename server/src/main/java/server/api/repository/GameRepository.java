package server.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import server.api.model.Game;

import java.util.List;


public interface GameRepository extends JpaRepository<Game, Long> {
  List<Game> findByPlayer1AndPlayer2OrderByTimestampDesc(String player1, String player2);

  Game findFirstByPlayer1AndPlayer2OrderByTimestampDesc(String player1, String player2);

  List<Game> findByPlayer1OrPlayer2OrderByTimestampDesc(String player1, String player2);
}
