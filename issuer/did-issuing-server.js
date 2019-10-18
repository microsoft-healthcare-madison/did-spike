//const bodyParser = require('body-parser');
const cors = require("cors");
const express = require("express");
import { createIdentity } from "nacl-did";

import {
  createVerification,
  verificationFhirResource,
  verificationEstablish,
  issueChallenge,
  processChallengeResponse
} from "./lib";

import store from "./store";
import twilio from "twilio";

const app = express();
export default app;
const port = process.env.PORT || 3000;
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  serviceId: process.env.TWILIO_SERVICE_ID
};

const twilioClient = twilio(
  twilioConfig.accountSid,
  twilioConfig.authToken
);
const twilioService = twilioClient.verify.services(twilioConfig.serviceId);

const identity = createIdentity();

const confirm = async (req, res) => {
  const { verificationId, verificationCode } = identity.decrypt(req.body);
  // TODO: raise an exception if the body fails decryption.
  const verification = store.get().verifications[verificationId];

  const result = await processChallengeResponse(verification, verificationCode, twilioService);
  store.dispatch(...result) 
};

const debug = (req, res) => {
  res.send("<pre>" + JSON.stringify(identity, null, 2) + "</pre>");
};

const did = (req, res) => {
  res.send(identity.did);
};

/**
 * Handle a POST request to verify a contact point and FHIR resource access.
 * Decrypt the request
 * Return the ID of the internal verification object
 */
const verify = (req, res) => {
  console.log(JSON.stringify(req.body, null, 2)); // XXX
  // TODO: decrypt the request using the identity.
  const plain = identity.decrypt(req.body);
  console.log(JSON.stringify(plain, null, 2)); // XXX
  const v = createVerification(plain);
  store.dispatch("verifications/add", v);

  // TODO: should the response be encrypted using the UI's DID?
  res.send(request.id);
};

app.use(cors());

app.use(function addDidResponseHeader(req, res, next) {
  res.set("did", identity.did);
  next();
});

app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(express.json());

app.get("/", (req, res) => res.json(identity));
app.post("/confirm", confirm);
app.get("/did", did);
app.get("/debug", debug);
app.get("/check");
app.post("/verify", verify);

app.use(function(req, res, next) {
  res.status(404).send("Sorry can't find that!");
});

app.listen(port, () => console.log(`http://localhost:${port}`));

store.on("@changed", (...args) => {
  console.log("Changed", store.get());
});

store.on("@dispatch", async (state, [event, data]) => {
  if (event === "verifications/add") {
    const nextResult = await verificationEstablish(data);
    store.dispatch(...nextResult);
  } else if (event === "verifications/establish") {
    const nextResult = await verificationFhirResource(
      state.verifications[data.id]
    );
    store.dispatch(...nextResult);
  } else if (event === "verifications/verify-fhir") {
    const nextResult = await issueChallenge(
      state.verifications[data.id],
      twilioService
    );
    store.dispatch(...nextResult);
  }
});
