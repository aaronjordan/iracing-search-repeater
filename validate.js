const c = require("./constants");
const {getAuthHeader} = require("./helpers");

/**
 * Checks the auth header of a request and clears expired cookies
 * 
 * @param {Request} req the node request
 * @param {Response} res the response to submit
 */
const validateAuthHeader = (req, res) => {
  const systemTime = Date.now();
  const authHeader = getAuthHeader(req);
  const startCount = Object.keys(authHeader).length;

  for (const key in authHeader) {
    const cookieOptions = authHeader[key][1];

    if ("expires" in cookieOptions) {
      const expiry = new Date(cookieOptions.expires);
      if (systemTime > expiry.valueOf()) {
        delete authHeader[key];
      }
    }
  }

  if (startCount !== Object.keys(authHeader).length) {
    res.setHeader(c.HEADERS.SET_AUTH, authHeader);
  }

  if (Object.keys(authHeader).length === 0) {
    res.sendStatus(205);
  } else {
    res.sendStatus(204);
  }
}

module.exports = validateAuthHeader;