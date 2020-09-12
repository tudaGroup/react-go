package server.api.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;
import server.api.model.Challenge;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;


@Controller
public class ChallengeController {

  List<Challenge> challenges = new ArrayList<>();

  @MessageMapping("/connect")
  @SendTo("/topic/challenges")
  public List<Challenge> clientConnects() {
    return challenges;
  }

  @MessageMapping("/addChallenge")
  @SendTo("/topic/challenges")
  public List<Challenge> addChallenge(@RequestBody Challenge newChallenge) {
    // Filter out any previous open challenges by the player who created the new challenge
    challenges = challenges.stream()
      .filter(challenge -> !challenge.getCreator().equals(newChallenge.getCreator()))
      .collect(Collectors.toList());

    challenges.add(newChallenge);
    return challenges;
  }

  @MessageMapping("/deleteChallenge")
  @SendTo("/topic/challenges")
  public List<Challenge> deleteChallenge(@RequestBody String creator) {
    challenges = challenges.stream()
      .filter(challenge -> !challenge.getCreator().equals(creator))
      .collect(Collectors.toList());

    return challenges;
  }

  @MessageMapping("/acceptChallenge/{user}")
  @SendTo("/topic/acceptChallenge/{user}")
  public Challenge acceptChallenge(@DestinationVariable String user, @RequestBody Challenge challenge) {
    return challenge;
  }
}
