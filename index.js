const express = require("express");
const cors = require("cors");
// const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const c = require("./constants");
const repeater = require("./repeater");
const validateAuthHeader = require("./validate");
 
const app = express();
app.use(cors())
app.use(bodyParser.json());
// app.use(cookieParser());

app.use("/*", repeater);
app.get("/", (_, res) => res.status(200).send("SearchRepeater is live"));
app.get("/validate", validateAuthHeader);

app.listen(c.PORT, () => {
  if (!c.HOSTNAME) throw TypeError("HOSTNAME is not defined in configuration.");
  if (!c.FORWARDED_LOCATION) throw TypeError("FORWARDED_LOCATION is not defined in configuration.");
  console.log(`Will forward requests: ${c.HOSTNAME} -> ${c.FORWARDED_LOCATION}`);
  console.log(`SearchRepeater is initialized on port ${c.PORT}`);
});

