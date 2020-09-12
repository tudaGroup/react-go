package server.api.model;


public class GameMessage {
  private String type; // MOVE, PASS, FORFEIT or RESULT
  private String sender;
  private int x; // only for MOVE
  private int y;  // only for MOVE
  private Game game; // only for RESULT

  public GameMessage(String type, String sender, int x, int y, Game game) {
    this.type = type;
    this.sender = sender;
    this.x = x;
    this.y = y;
    this.game = game;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getSender() {
    return sender;
  }

  public void setSender(String sender) {
    this.sender = sender;
  }

  public int getX() {
    return x;
  }

  public void setX(int x) {
    this.x = x;
  }

  public int getY() {
    return y;
  }

  public void setY(int y) {
    this.y = y;
  }

  public Game getGame() {
    return game;
  }

  public void setGame(Game game) {
    this.game = game;
  }
}
