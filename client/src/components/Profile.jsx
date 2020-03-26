import React, { useState } from 'react';
import RatingChart from './RatingChart';
import { Row, Col } from 'antd';
import { FireOutlined, ThunderboltOutlined } from '@ant-design/icons';

const Profile = () => {
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [username, setUsername] = useState('shangsuru');
  const [fullName, setFullName] = useState('Henry Helm');
  const [country, setCountry] = useState('Germany');
  const [city, setCity] = useState('Darmstadt');
  const [memberSince, setMemberSince] = useState('May 31, 2016');
  const [biography, setBiography] = useState(
    'Hey, I am 21 years old and I am studying computer science. I also like to play a lot of Go in my freetime!'
  );
  const [wins, setWins] = useState(7);
  const [losses, setLosses] = useState(3);
  const [games, setGames] = useState([
    {
      player1: 'shangsuru',
      player2: 'lukas',
      time: 20,
      timeIncrement: 5,
      size: 13,
      rated: 'true',
      oldRatingPlayer1: 14,
      newRatingPlayer1: 18,
      oldRatingPlayer2: 34,
      newRatingPlayer2: 27,
      timestamp: '5 days ago',
      player1Won: true
    },
    {
      player1: 'sijun',
      player2: 'shangsuru',
      time: 40,
      timeIncrement: 5,
      size: 19,
      rated: 'true',
      oldRatingPlayer1: 45,
      newRatingPlayer1: 47,
      oldRatingPlayer2: 12,
      newRatingPlayer2: 10,
      timestamp: '10 days ago',
      player1Won: true
    },
    {
      player1: 'shangsuru',
      player2: 'sijun',
      time: 10,
      timeIncrement: 2,
      size: 9,
      rated: 'true',
      oldRatingPlayer1: 42,
      newRatingPlayer1: 47,
      oldRatingPlayer2: 20,
      newRatingPlayer2: 17,
      timestamp: '11 days ago',
      player1Won: true
    }
  ]);

  const renderRatingChanges = (oldRating, newRating, won) => {
    let ratingDifference = newRating - oldRating;
    let style = won ? { color: '#629923' } : { color: '#CC3233' };

    return (
      <Row>
        {oldRating}
        <span style={style}>
          {ratingDifference >= 0 ? '+' : ''}
          {ratingDifference}
        </span>
      </Row>
    );
  };

  const renderFlag = country => {
    let altText, countryID;
    switch (country) {
      case 'Germany':
        altText = 'Germany';
        countryID = 'DE';
        break;
      default:
        altText = 'USA';
        countryID = 'US';
        break;
    }
    return (
      <img
        width='5%'
        alt={altText}
        src={`http://catamphetamine.gitlab.io/country-flag-icons/3x2/${countryID}.svg`}
        style={{ marginRight: '7px', transform: 'translate(0, -0.2vw)' }}
      />
    );
  };

  return (
    <div className='main'>
      <div className='profile'>
        <Row>
          <Col className='profile__username'>{username}</Col>
        </Row>
        <Row>
          <Col span={12} className='profile__graph'>
            <RatingChart
              title='Rating'
              data={[0, 4, 8, 2, 6, 10, 14]}
              labels={[
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July'
              ]}
            />
          </Col>
          <Col span={12} className='profile__info'>
            <div>{fullName}</div>
            <div>
              {renderFlag(country)}
              {city}, {country}
            </div>
            <div></div>
            <div>Member since {memberSince}</div>
            <div className='profile__biography'>{biography}</div>
          </Col>
        </Row>
        <Row justify='space-around' className='profile__count'>
          <Col>{wins + losses} games</Col>
          <Col>{wins} wins</Col>
          <Col>{losses} losses</Col>
        </Row>

        <div className='profile__gamelist'>
          {games.map(
            ({
              player1,
              player2,
              time,
              timeIncrement,
              size,
              rated,
              oldRatingPlayer1,
              newRatingPlayer1,
              oldRatingPlayer2,
              newRatingPlayer2,
              timestamp,
              player1Won
            }) => (
              <Row justify='space-around' className='profile__game'>
                <Col>
                  <Row>
                    <Col>
                      <Row>
                        {time}+{timeIncrement} •{' '}
                        {size == 9 ? 'SMALL' : size == 13 ? 'MEDIUM' : 'LARGE'}{' '}
                        • {rated ? 'RATED' : 'CASUAL'}
                      </Row>
                      <Row>{timestamp}</Row>
                    </Col>
                  </Row>
                </Col>
                <Col>
                  <Row gutter={[8, 8]}>
                    <Col>
                      <Row>{player1}</Row>
                      {renderRatingChanges(
                        oldRatingPlayer1,
                        newRatingPlayer1,
                        player1Won
                      )}
                    </Col>
                    <Col>
                      <ThunderboltOutlined />
                    </Col>
                    <Col>
                      <Row>{player2}</Row>
                      {renderRatingChanges(
                        oldRatingPlayer2,
                        newRatingPlayer2,
                        !player1Won
                      )}
                    </Col>
                  </Row>
                </Col>
              </Row>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
