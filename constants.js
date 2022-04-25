const config = require("./config.json");

module.exports = {
  DEBUG: config.debug || false,
  PORT: config.port || 9001,
  FORWARDED_LOCATION: config.forwarded_location,
  HOSTNAME: config.hostname,
};