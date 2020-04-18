import React from 'react';

const EasterEgg = () => {
  return (
    <div>
      <img src={process.env.PUBLIC_URL + '/egg.gif'} height='600px' />
    </div>
  );
};

export default EasterEgg;
