package server.api.model;

public class ChatMessage {
  private String user;
  private String text;

  public ChatMessage(String user, String text) {
    this.user = user;
    this.text = text;
  }

  public String getUser() {
    return user;
  }

  public void setUser(String user) {
    this.user = user;
  }

  public String getText() {
    return text;
  }

  public void setText(String text) {
    this.text = text;
  }
}
