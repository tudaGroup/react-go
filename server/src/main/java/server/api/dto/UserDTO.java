package server.api.dto;

import server.api.model.Game;
import server.api.model.User;
import server.api.repository.GameRepository;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

public class UserDTO {
  GameRepository gameRepository;

  private final Long id;
  private Date memberSince;
  private String username;
  private String email;
  private String country;
  private String location;
  private String biography;
  private String givenName;
  private String surName;
  private List<Rating> ratings;


  public UserDTO(User user, GameRepository gameRepository) {
    this.gameRepository = gameRepository;

    this.id = user.getId();
    this.memberSince = user.getMemberSince();
    this.username = user.getUsername();
    this.email = user.getEmail();
    this.country = user.getCountry();
    this.location = user.getLocation();
    this.biography = user.getBiography();
    this.givenName = user.getGivenName();
    this.surName = user.getSurName();
    this.ratings = this.computeRatings();
  }

  private List<Rating> computeRatings() {
    List<Game> games = gameRepository.findByPlayer1OrPlayer2OrderByTimestampDesc(username, username);
    // Get a list of rating and timestamp for each game played
    List<Rating> ratings = games.stream()
      .map(game -> new Rating(
        game.getTimestamp(),
        game.getPlayer1().equals(username) ? game.getNewRatingPlayer1() : game.getNewRatingPlayer2()))
      .collect(Collectors.toList());

    // Save only the most recent rating for each day
    List<Rating> dailyRatings = new ArrayList<>();
    if (!ratings.isEmpty()) {
      dailyRatings.add(ratings.get(0));
    }
    for (int i = 1; i < ratings.size(); i++) {
      if (ratings.get(i).hasNotSameDateAs(ratings.get(i - 1).time)) {
        dailyRatings.add(ratings.get(i));
      }
    }

    // Add beginner rating of 0
    dailyRatings.add(new Rating(memberSince, 0));
    return dailyRatings;
  }

  public Long getId() {
    return id;
  }

  public Date getMemberSince() {
    return memberSince;
  }

  public void setMemberSince(Date memberSince) {
    this.memberSince = memberSince;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getCountry() {
    return country;
  }

  public void setCountry(String country) {
    this.country = country;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getBiography() {
    return biography;
  }

  public void setBiography(String biography) {
    this.biography = biography;
  }

  public String getGivenName() {
    return givenName;
  }

  public void setGivenName(String givenName) {
    this.givenName = givenName;
  }

  public String getSurName() {
    return surName;
  }

  public void setSurName(String surName) {
    this.surName = surName;
  }

  public void setRatings(List<Rating> ratings) {
    this.ratings = ratings;
  }

  public List<Rating> getRatings() {
    return ratings;
  }
}
