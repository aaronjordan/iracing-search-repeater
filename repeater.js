const axios = require("axios");
const c = require("./constants");
const {getAuthHeader, attachAuthHeader, debugLog, generateLogId} = require("./helpers");

/**
 * Forwards requests to the configured location and passes cookies along as specified
 * by the forwarded location.
 * 
 * @param {Request} req the request object to forward
 * @param {Response} res the response object to reply with
 * @param {Function} next call the next middleware for express
 */
async function useSearchRepeater(req, res, next) {
  // always allow headers to be read
  res.setHeader("Access-Control-Expose-Headers", "*");
  
  // handle validate calls without ext. calls.
  if (req.method == "GET" && req.originalUrl.includes("/validate")) return next();

  const requestLogId = generateLogId();
  debugLog(`(${requestLogId}) will forward request:\n\t${req.headers.referer} -> ${c.FORWARDED_LOCATION}`);
  const authEntries = Object.entries(getAuthHeader(req));
  const cookieEntries = authEntries.map(([name, details]) => [name, details[0]]); // drop metadata

  const cookie = cookieEntries
    .reduce((jar, entry) => jar + entry.join('=') + '; ', "")
    .slice(0, -2);

  const forwardHeaders = {};
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
      attachAuthHeader(res, response.headers['set-cookie']);
    }

    const forward = {
      from: response.config.url,
      forward: {
        head: response.headers,
        body: response.data,
        status: response.status,
      },
    };

    if (response.data?.link) {
      try {
        const dataRes = await axios.get(response.data.link);
        forward.data = dataRes.data;
      } catch (e) {
        debugLog(`(${requestLogId}) ERROR ${e.response?.status} response from data`);
      }
    }

    res.status(200).send(forward);
  } catch (e) {
    if (e.response) {
      debugLog(`(${requestLogId}) ERROR ${e.response?.status} response from server`);
      if (Array.isArray(e.response.headers['set-cookie'])) {
        attachAuthHeader(res, e.response.headers['set-cookie']);
      }

      const forwardError = {
        from: e.response.config.url,
        forward: {
          head: e.response.headers,
          body: e.response.data,
          status: e.response.status,
        },
      };

      res.status(e?.response?.status ?? 400).send(forwardError);
    } else {
      debugLog(`(${requestLogId}) Local forwarding error:`);
      console.log(e);

      res.sendStatus(500);
    }
  }
}

module.exports = useSearchRepeater;