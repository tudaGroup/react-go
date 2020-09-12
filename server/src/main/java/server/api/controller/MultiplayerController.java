package server.api.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import server.api.model.ChatMessage;
import server.api.model.GameMessage;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Controller
public class MultiplayerController {

  List<String> waitingUsers = new ArrayList<>();

  @MessageMapping("/joinGame/{player1}/{player2}")
  @SendTo("/topic/system/{player1}/{player2}")
  public String joinGame(@DestinationVariable String player1, @DestinationVariable String player2, @RequestBody String user) {
    waitingUsers.add(user);

    // Game can start when both players joined
    if (waitingUsers.contains(player1) && waitingUsers.contains(player2)) {
      // Users are no longer waiting for game to start
      waitingUsers.removeAll(Collections.singleton(player1));
      waitingUsers.removeAll(Collections.singleton(player2));
      return "CONNECTION_ESTABLISHED";
    }

    return "JOINED";
  }

  @MessageMapping("/leaveGame/{player1}/{player2}")
  @SendTo("/topic/system/{player1}/{player2}")
  public String leaveGame(@DestinationVariable String player1, @DestinationVariable String player2) {
    return "DISCONNECTED";
  }

  @MessageMapping("/chat/{player1}/{player2}")
  @SendTo("/topic/chat/{player1}/{player2}")
  public ChatMessage sendChatMessage(@DestinationVariable String player1, @DestinationVariable String player2, @RequestBody ChatMessage message) {
    return message;
  }

  @MessageMapping("/game/{player1}/{player2}")
  @SendTo("/topic/game/{player1}/{player2}")
  public GameMessage gameMove(@DestinationVariable String player1, @DestinationVariable String player2, @RequestBody GameMessage message) {
    return message;
  }
}
