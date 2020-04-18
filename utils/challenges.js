let challenges = [];

const getChallenges = () => {
  return challenges;
};

const setChallenges = challengesUpdated => {
  challenges = challengesUpdated;
};

module.exports = {
  getChallenges,
  setChallenges
};
