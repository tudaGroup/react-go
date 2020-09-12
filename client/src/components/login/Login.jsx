import React, { useState } from "react";
import { Button, Card, Input } from "antd";
import { Link } from "react-router-dom";
import history from "../../history";
import api from "../../api";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    api
      .post("/users/login", { username: name, password })
      .then(res => {
        localStorage.setItem("jwt", res.data);
        history.push("/");
      })
      .catch(() => {
        createErrorMessage("Username or password is invalid.");
      });
  };

  const createErrorMessage = error => {
    setError(error);
    setTimeout(() => setError(""), 3000);
  };

  const handleKeyPress = event => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="entry">
      <Card>
        <h1 className="entry__title">Sign In</h1>
        <p className="entry__error">{error}</p>
        <div className="entry__input">
          Username
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyPress={e => handleKeyPress(e)}
          />
        </div>
        <div className="entry__input">
          Password
          <Input.Password
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyPress={e => handleKeyPress(e)}
          />
        </div>
        <Button
          type="primary"
          className="entry__button"
          onClick={() => handleLogin()}
        >
          Sign in
        </Button>
        <div className="entry__links">
          <Link className="entry__links" to="/register">
            Register
          </Link>
          <Link className="entry__links" to="/pwresetreq">
            Password reset
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
