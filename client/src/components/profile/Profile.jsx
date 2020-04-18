import React, { useState, useEffect } from 'react';
import history from '../../history';
import api from '../../api';
import moment from 'moment';
import RatingChart from './RatingChart';
import { Row, Col } from 'antd';
import {
  ThunderboltOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

const Profile = () => {
  const [username, setUsername] = useState('');
  const [givenName, setGivenName] = useState('');
  const [surName, setSurName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [memberSince, setMemberSince] = useState('May 31, 2016');
  const [biography, setBiography] = useState('');
  const [ratings, setRatings] = useState([]);
  const [wins, setWins] = useState(7);
  const [losses, setLosses] = useState(3);
  const [games, setGames] = useState([]);
  const [userNotFound, setUserNotFound] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    // Redirect to login page if user is without token
    if (token === null) {
      history.push('/login');
    }

    // Get username of requested profile
    const requestedProfile = document.URL.split('/').pop();
    // Fetch user data
    api
      .get(`users/${requestedProfile}`, {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })
      .then((result) => {
        const user = result.data.user;
        setUsername(user.username);
        setGivenName(user.givenName);
        setSurName(user.surName);
        setCity(user.location);
        setCountry(user.country);
        setBiography(user.biography);
        setMemberSince(moment(user.memberSince).format('LL'));

        // Create graph coordinates for rating graph
        let ratings = [];
        for (let rating of result.data.ratings) {
          ratings.push({ x: new Date(rating.time), y: rating.rating });
        }
        setRatings(ratings);

        // Fetch games
        api
          .get(
            `games/${result.data.user.username}`,

            {
              params: { page },
              headers: {
                Authorization: 'Bearer ' + token,
              },
            }
          )
          .then((result) => {
            console.log(result);
            setGames(result.data.games);
            setWins(result.data.wins);
            setLosses(result.data.losses);
          });
      })
      .catch((e) => {
        setUserNotFound(true);
        console.log(e);
      });
  }, [page]);

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

  const renderFlag = (country) => {
    let altText, countryID;
    switch (country) {
      case 'Korea':
        altText = 'Korea';
        countryID = 'KR';
        break;
      case 'Taiwan':
        altText = 'Taiwan';
        countryID = 'TW';
        break;
      case 'Sweden':
        altText = 'Sweden';
        countryID = 'SE';
        break;
      case 'France':
        altText = 'France';
        countryID = 'FR';
        break;
      case 'USA':
        altText = 'USA';
        countryID = 'US';
        break;
      default:
        altText = 'Germany';
        countryID = 'DE';
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

  if (userNotFound) {
    return (
      <div className='notification' onClick={() => history.push('/')}>
        User not found!
      </div>
    );
  }

  const handlePagination = (direction) => {
    if (direction === 'left' && page > 1) {
      setPage(page - 1);
    }

    if (direction === 'right' && page * 7 < wins + losses) {
      setPage(page + 1);
    }
  };

  return (
    <div className='main'>
      <div className='container'>
        <Row>
          <Col className='profile__username'>{username}</Col>
        </Row>
        <Row>
          <Col span={12} className='profile__graph'>
            <RatingChart title='Rating' ratings={ratings} />
          </Col>
          <Col span={12} className='profile__info'>
            <div>
              {givenName} {surName}
            </div>
            <div>
              {country ? <span>{renderFlag(country)}</span> : null}
              {city}
              {city && country ? ', ' : null} {country}
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
              player1Won,
            }) => (
              <Row justify='space-around' className='profile__game'>
                <Col>
                  <Row>
                    <Col>
                      <Row>
                        {time}+{timeIncrement} •{' '}
                        {size === 9
                          ? 'SMALL'
                          : size === 13
                          ? 'MEDIUM'
                          : 'LARGE'}{' '}
                        • {rated ? 'RATED' : 'CASUAL'}
                      </Row>
                      <Row>{moment(timestamp).fromNow()}</Row>
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
        <div className='pagination'>
          <LeftOutlined
            onClick={() => handlePagination('left')}
            className='pagination__icon'
          />{' '}
          <RightOutlined
            onClick={() => handlePagination('right')}
            className='pagination__icon'
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
