const crypto = require("crypto");
const c = require("./constants.js");

/**
 * The shape of an authorization header.
 * 
 * Keyed by cookie name, values are [cookie value string, cookie options object]
 * 
 * @typedef AuthHeader
 * @type {Object<string, [string, Object<string, string>]>}

 */

// gets a pseudo-random id
const generateLogId = () => crypto.randomBytes(6).toString("base64");

// log to the console if in debug mode
const debugLog = (message) => c.DEBUG && 
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

const DOMAIN_ARG = c.HOSTNAME.includes(":") ? 
  c.HOSTNAME.slice(0, c.HOSTNAME.indexOf(':')) :
  `.${c.HOSTNAME}`;

/**
 * Attaches auth header to the response object as a set-auth header.
 *  
 * @param {Response} res the response object to manipulate
 * @param {string[]} cookieArray the array of set-cookie headers provided by req.headers
 * @returns {AuthHeader} the object representing the setAuthHeader which was written to headers
 */
const attachAuthHeader = (res, cookieArray) => {
  const setAuth = {};
  
  for (const cookie of cookieArray) {
    const {name, value, options} = parseCookie(cookie);
    if ("domain" in options) options.domain = DOMAIN_ARG;
    if ("expires" in options) options.expires = new Date(options.expires);
    if ("maxAge" in options) options.maxAge *= 1000;
    setAuth[name] = [value, options];
  }

  const authHeaderContent = Buffer.from(JSON.stringify(setAuth), "utf-8").toString("base64url");
  res.setHeader("Set-Authorization", authHeaderContent);
  return setAuth;
};

/**
 * Gets an auth header from the b64url string in 'Authorization'
 * @param {Request} req the request to manipulate
 * @returns {AuthHeader} the parsed authHeader in the request
 */
const getAuthHeader = (req) => {
  if (!req.headers.authorization) return [];

  const b64url = req.headers.authorization;
  const utf16 = Buffer.from(b64url, 'base64url').toString('utf-8');

  try {
    const decoded = JSON.parse(utf16);
    return decoded;
  } catch (e) {
    console.error("  Failed to parse authorization header");
    return [];
  }
};

module.exports = {
  attachAuthHeader,
  parseCookie,
  debugLog,
  generateLogId,
  getAuthHeader
};