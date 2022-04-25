const crypto = require("crypto");
const c = require("./config.json");

// gets a pseudo-random id
const generateLogId = () => crypto.randomBytes(6).toString("base64");

// log to the console if in debug mode
const debugLog = (message) => c.debug && 
  console.log(typeof message === "string" ? `SR: ${message}` : message);

// format a cookie option from html transit syntax to express syntax
const formatPropName = (key) => 
  key?.trim().toLowerCase() // use all lowercase, no spaces
    .replace(/-(.)/, key[key.indexOf('-')+1].toUpperCase()) // convert max-age/http-only to maxAge, httpOnly

/**
 * Parses a single cookie entry and returns some structured data describing the cookie.
 * 
 * @typedef CookieData
 * @type {object}
 * @property {string} name the string name of the cookie
 * @property {string} value the string value of the cookie
 * @property {Object<string, string>} options parameters set on the cookie
 * 
 * @param {string} cookie the string describing the cookie in standard header format
 * @returns {CookieData}
 */
const parseCookie = (cookie) => {
  if (typeof cookie !== "string") throw new TypeError("parseCookie: cookie must be a string");

  const attributes = [];
  let anchorIndex = cookie.indexOf('=');
  let mostRecentDelimiterIndex = 0;

  // grab left (prop) and right (value) side of each named cookie attribute
  while (anchorIndex !== -1) {
    const prop = cookie.slice(mostRecentDelimiterIndex, anchorIndex);
    mostRecentDelimiterIndex = cookie.indexOf(';', anchorIndex);
    if (mostRecentDelimiterIndex === -1) mostRecentDelimiterIndex = cookie.length;
    const value = cookie.slice(anchorIndex+1, mostRecentDelimiterIndex);

    if (prop.length) attributes.push({[formatPropName(prop)]: value.trim()});
    anchorIndex = cookie.indexOf('=', mostRecentDelimiterIndex);
    mostRecentDelimiterIndex += 1; // advance past the delimiter for next split()
  }

  const basicInfo = Object.entries(attributes.shift()).pop();
  const options = attributes.reduce((opts, next) => ({...next, ...opts}), {});
  
  return {
    name: basicInfo[0],
    value: basicInfo[1],
    options
  };
};

/**
 * Attaches cookies to the response object.
 *  
 * @param {Response} res the response object to manipulate
 * @param {string[]} cookieArray the array of set-cookie headers provided by req.headers
 */
const attachCookies = (res, cookieArray) => {
  for (const cookie of cookieArray) {
    const {name, value, options} = parseCookie(cookie);
    if ("domain" in options) delete options.domain // options.domain = c.HOSTNAME.slice(c.HOSTNAME.indexOf('://') + 3);
    if ("expires" in options) options.expires = new Date(options.expires);
    if ("maxAge" in options) options.maxAge *= 1000;
    res.cookie(name, value, options);
  }
};

module.exports = {
  attachCookies,
  parseCookie,
  debugLog,
  generateLogId
};