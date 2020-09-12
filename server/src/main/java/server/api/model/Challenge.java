package server.api.model;

public class Challenge {
  String creator;
  String opponent;
  long id;
  int rating;
  int boardSize;
  int duration;
  int timeIncrement;
  String mode;

  public Challenge(String creator, long id, int rating, int boardSize, int duration, int timeIncrement, String mode) {
    this.creator = creator;
    this.id = id;
    this.rating = rating;
    this.boardSize = boardSize;
    this.duration = duration;
    this.timeIncrement = timeIncrement;
    this.mode = mode;
  }

  public String getCreator() {
    return creator;
  }

  public void setCreator(String creator) {
    this.creator = creator;
  }

  public String getOpponent() {
    return opponent;
  }

  public void setOpponent(String opponent) {
    this.opponent = opponent;
  }

  public long getId() {
    return id;
  }

  public void setId(long id) {
    this.id = id;
  }

  public int getRating() {
    return rating;
  }

  public void setRating(int rating) {
    this.rating = rating;
  }

  public int getBoardSize() {
    return boardSize;
  }

  public void setBoardSize(int boardSize) {
    this.boardSize = boardSize;
  }

  public int getDuration() {
    return duration;
  }

  public void setDuration(int duration) {
    this.duration = duration;
  }

  public int getTimeIncrement() {
    return timeIncrement;
  }

  public void setTimeIncrement(int timeIncrement) {
    this.timeIncrement = timeIncrement;
  }

  public String getMode() {
    return mode;
  }

  public void setMode(String mode) {
    this.mode = mode;
  }
}
