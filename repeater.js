const axios = require("axios");
const c = require("./constants");
const {debugLog, generateLogId} = require("./helpers");

/**
 * Forwards requests to the configured location and passes cookies along as specified
 * by the forwarded location.
 * 
 * @param {Request} req the request object to forward
 * @param {Response} res the response object to reply with
 * @param {Function} next call the next middleware for express
 */
async function useSearchRepeater(req, res, next) {
  if (typeof req.headers.referer != "string" || req.headers.referer.includes(c.HOSTNAME)) {
    debugLog("direct call does not forward on searchRepeater");
    return next();
  }

  const requestLogId = generateLogId();
  debugLog(`(${requestLogId}) will forward request:\n\t${req.headers.referer} -> ${c.FORWARDED_LOCATION}`);
  const cookieEntries = Object.entries(req.cookies);
  const forwardHeaders = {};

  const cookie = cookieEntries
    .reduce((jar, entry) => jar + entry.join('=') + '; ', "")
    .slice(0, -2);

  if (cookie) {
    forwardHeaders.cookie = cookie;
    debugLog(`\tcookies (${cookieEntries.length}) will be forwarded`);
  }

  const config = {
    method: req.method,
    url: `${c.FORWARDED_LOCATION}${req.originalUrl}`,
    headers: forwardHeaders
  };

  if (Object.keys(req.body).length > 0 && config.method !== "get") {
    config.data = req.body;
  }

  try {
    const response = await axios(config);

    debugLog(`(${requestLogId}) success response from server`);
    if (Array.isArray(response.headers['set-cookie'])) {
      attachCookies(res, response.headers['set-cookie']);
    }

    const forward = {
      from: response.config.url,
      forward: {
        head: response.headers,
        body: response.data,
        status: response.status,
      },
    };

    res.status(200).send(forward);
  } catch (e) {
    if (e.response) {
      debugLog(`(${requestLogId}) ERROR ${e.response?.status} response from server`);
      if (Array.isArray(e.response.headers['set-cookie'])) {
        attachCookies(res, e.response.headers['set-cookie']);
      }

      const forwardError = {
        from: e.response.config.url,
        forward: {
          head: e.response.headers,
          body: e.response.data,
          status: e.response.status,
        },
      };

      res.status(400).send(forwardError);
    } else {
      debugLog(`(${requestLogId}) Local forwarding error:`);
      console.log(e);
      
      res.sendStatus(500);
    }
  }
}

module.exports = useSearchRepeater;