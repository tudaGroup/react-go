import React, { useState } from "react";
import { Button, Card, Input } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import history from "../../history";
import api from "../../api";

const PasswordResetRequest = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [disabled, setDisabled] = useState(false);

  const createErrorMessage = error => {
    setError(error);
    setTimeout(() => setError(""), 3000);
  };

  const handleReset = () => {
    if (email.length < 1) {
      createErrorMessage("No input given.");
      return;
    }
    api.post("/users/resetpassword", { email }).catch(err => {
      console.log(err);
    });
    createErrorMessage(
      "An email has been sent to you with a link to reset the password."
    );

    // Block send button and redirect to login
    setDisabled(true);
    setTimeout(() => {
      history.push("/login");
    }, 3000);
  };

  const handleKeyPress = event => {
    if (event.key === "Enter") {
      handleReset();
    }
  };

  return (
    <div className="entry">
      <Card>
        <h1 className="entry__title">Password reset</h1>
        <p className="entry__error">{error}</p>
        <div className="entry__input">
          Email
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyPress={e => handleKeyPress(e)}
          />
        </div>
        <Button
          type="primary"
          className="entry__button"
          onClick={() => handleReset()}
          disabled={disabled}
        >
          <CheckOutlined /> Email me a link
        </Button>
      </Card>
    </div>
  );
};

export default PasswordResetRequest;
