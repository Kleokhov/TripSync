const destinations = require('./destinations');
const planning = require('./planning');
const countries = require('./countries');
const cities = require('./cities');
const recommendations = require('./recommendations');

module.exports = {
  // destinations
  ...destinations,
  // planning
  ...planning,
  // countries
  ...countries,
  // cities
  ...cities,
  // recommendations
  ...recommendations,
};