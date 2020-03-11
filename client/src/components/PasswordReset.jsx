import React, { useState } from 'react';
import { Button, Card, Input } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const createErrorMessage = error => {
    setError(error);
    setTimeout(() => setError(''), 3000);
  };

  const handleReset = () => {
    createErrorMessage('Sorry, not implemented yet!');
  };

  return (
    <div className='entry'>
      <Card>
        <h1 className='entry__title'>Password reset</h1>
        <p className='entry__error'>{error}</p>
        <div className='entry__input'>
          Email
          <Input value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Button
          type='primary'
          className='entry__button'
          onClick={() => handleReset()}
        >
          <CheckOutlined /> Email me a link
        </Button>
      </Card>
    </div>
  );
};

export default PasswordReset;
