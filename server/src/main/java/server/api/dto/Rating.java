package server.api.dto;

import java.util.Date;

public class Rating {
    Date time;
    int rating;

    public Rating(Date time, int rating) {
        this.time = time;
        this.rating = rating;
    }

    boolean hasNotSameDateAs(Date date) {
        return !(time.getDay() == date.getDay() && time.getMonth() == date.getMonth() && time.getYear() == date.getYear());
    }

    public Date getTime() {
        return time;
    }

    public void setTime(Date time) {
        this.time = time;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }
}
