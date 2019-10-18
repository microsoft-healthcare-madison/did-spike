const cors = require("cors");
const express = require("express");
import { createIdentity } from "nacl-did";

import {
  createVerification,
  verificationFhirResource,
  verificationEstablish,
  issueChallenge,
  issueCredential,
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
  serviceId: process.env.TWILIO_SERVICE_ID,
  enabled: process.env.TWILIO_ENABLED !== 'false'
};


let twilioService;
if (twilioConfig.enabled) {
  const twilioClient = twilio(
    twilioConfig.accountSid,
    twilioConfig.authToken
  );
  twilioService = twilioClient.verify.services(twilioConfig.serviceId);
} else {
  twilioService = {
    verifications: {
      create: () => Promise.resolve({skipped: true})
    },
    verificationChecks:  {
      create: () => Promise.resolve({skipped: true, status: 'approved'})
    }
  }
}

const identity = createIdentity();

const confirm = async (req, res) => {
  const { verificationId, verificationCode } = JSON.parse(identity.decrypt(req.body));
  // TODO: raise an exception if the body fails decryption.
  console.log("confirming phone number for", req.body, verificationId, verificationCode)
  const verification = store.get().verifications[verificationId];

  const result = await processChallengeResponse(verification, verificationCode, twilioService);
  store.dispatch(...result) 
  res.json({confirming: true})
};

const did = (req, res) => {
  res.send(identity.did);
};

/**
 * Handle a POST request to verify a contact point and FHIR resource access.
 * Decrypt the request
 * Return the ID of the internal verification object
 */
const begin = async (req, res) => {
  console.log("begin with body", JSON.stringify(req.body, null, 2)); // XXX
  // TODO: decrypt the request using the identity.

  const plain = JSON.parse(identity.decrypt(req.body));
  console.log(JSON.stringify(plain, null, 2)); // XXX

  const v = createVerification({
    ...plain,
    holderDid: req.body.from
  });
  store.dispatch("verifications/add", v);

  // TODO: should the response be encrypted using the UI's DID?
  const ret = await identity.encrypt(req.body.from, v.id)
  res.send(ret);
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

app.post("/confirm", confirm);
app.get("/did", did);

app.post("/CredentialRequest/new", begin);

app.post("/CredentialRequest/status", async (req, res) => {
  const plain = JSON.parse(identity.decrypt(req.body));
  const verification = store.get().verifications[plain.id]

  const senderDid = req.body.from

  if (verification.request.holderDid !== senderDid) {
    throw new Error("Can't request info on someone else's credential")
  }

  const ret = await identity.encrypt(senderDid, JSON.stringify(verification))
  res.send(ret)
});


// eslint-disable-next-line no-unused-vars
app.use(function(req, res, next) {
  res.status(404).send("Sorry can't find that!");
});

app.listen(port, () => console.log(`http://localhost:${port}`));

store.on("@changed", () => {
 //console.log("Changed", store.get());
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
  } else if (event === "verifications/complete-verify-phone") {
    const nextResult = await issueCredential(state.verifications[data.id], identity);
    store.dispatch(...nextResult);
  }
});

const v = createVerification({
  fhirBaseUrl: "https://r4.smarthealthit.org",
  resourceType: "Patient",
  resourceId: "835a3b08-e3b6-49c4-a23f-1fac8dc7a7a7",
  contactPoint: { system: 'phone', value: '555-258-5879', use: 'home' },
  verifyMethod: 'sms'
})

store.dispatch('verifications/add', v)