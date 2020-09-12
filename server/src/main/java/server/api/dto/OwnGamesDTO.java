package server.api.dto;

import server.api.model.Game;

import java.util.List;

public class OwnGamesDTO {
    List<Game> games;
    long wins;
    long losses;

    public OwnGamesDTO(List<Game> games, long wins, long losses) {
        this.games = games;
        this.wins = wins;
        this.losses = losses;
    }

    public List<Game> getGames() {
        return games;
    }

    public void setGames(List<Game> games) {
        this.games = games;
    }

    public long getWins() {
        return wins;
    }

    public void setWins(long wins) {
        this.wins = wins;
    }

    public long getLosses() {
        return losses;
    }

    public void setLosses(long losses) {
        this.losses = losses;
    }
}
