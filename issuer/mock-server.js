import { _errors, _verificationStates } from "./constants";

const cors = require('cors');
const express = require('express');

import { createIdentity } from "nacl-did";

// **** create our DID ****
const identity = createIdentity();

// **** create our server ****

const app = express();
export default app;

// **** allow-any ****

app.use(cors());

// **** add the DID to the header ****

app.use(function addDidResponseHeader(req, res, next) {
  // console.log('Received Request', req);
  res.set('did', identity.did);
  next();
});

// **** setup encoding / format stuff ****
app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(express.json());

// **** handlers ****

const did = (req, res) => {
  res.send(identity.did);
};

let mockVerification = {
  creationTs: Date.now(),
  id: '1',
  request: null,
  challenge: null,
  retrievedFhirResourceBody: null,
  status: _verificationStates.INIT,
  error: null,
  issuedCredential: null,
}

/**
 * Handle a POST request to verify a contact point and FHIR resource access.
 * Decrypt the request
 * Return the ID of the internal verification object
 */
const verify = async (req, res) => {
  const plain = JSON.parse(identity.decrypt(req.body));

  mockVerification.status = _verificationStates.INIT;
  mockVerification.request = plain;

  let data = await identity.encrypt(plain.holderDid, mockVerification.id);

  res.send(data);
};

const confirm = async (req, res) => {
  const { verificationId, verificationCode } = JSON.parse(identity.decrypt(req.body));

  mockVerification.status = _verificationStates.CONTACT_VERIFYING;
  
  res.json({confirming: true})
};

// **** setup our handlers ****

app.get("/", (req, res) => res.json(identity));
app.post("/confirm", confirm);
app.get("/did", did);
app.get("/check");
app.post("/CredentialRequest/new", verify);

app.post("/CredentialRequest/status", async (req, res) => {
  // const plain = JSON.parse(identity.decrypt(req.body));
  // console.log('Status request:');
  // console.log(plain);
  
  // console.log('Received request from:');
  // console.log(req.body.from);

  // console.log('For request owned by:');
  // console.log(mockVerification.request.holderDid);

  if (req.body.from !== mockVerification.request.holderDid) {
    res.status(500).send("No soup for you");
  }

  let data = await identity.encrypt(mockVerification.request.holderDid, JSON.stringify(mockVerification));

  res.send(data);

  // **** update status after first call ****

  mockVerification.status = _verificationStates.CONTACT_VERIFIED;
  mockVerification.issuedCredential = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFZDI1NTE5In0.eyJpc3MiOiJkaWQ6bmFjbDplSEE4SnkyejE3bFJZVXFTWlNPMG1NYWpRR1Uwb2JlSl9QMkJvVVJpZWw0IiwianRpIjoiMSIsInN1YiI6ImRpZDpuYWNsOnRoZS11c2VyLWRpZCIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwib3VyLWNvbnRleHQtZm9yLWZoaXItY2xhaW1zIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJGaGlyUGF0aWVudENyZWRlbnRpYWwiXSwiaWQiOiIxIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaGFzVmVyaWZpZWRDb250YWN0UG9pbnQiOnsidXNlIjoiaG9tZSIsInN5c3RlbSI6InBob25lIiwidmFsdWUiOiIrMTYxNzUwMDMyNTMifSwiaGFzQWNjZXNzVG9GaGlyUmVzb3VyY2UiOnsiZmhpclNlcnZlclVybCI6Imh0dHBzOi8vaGVhbHRoc3lzdGVtLmV4YW1wbGUub3JnIiwicmVzb3VyY2UiOnsicmVzb3VyY2VUeXBlIjoiUGF0aWVudCIsImlkIjoiMTIzIn19fSwiY3JlZGVudGlhbFNjaGVtYSI6eyJpZCI6Im91ci1qc29uLXNjaGVtYSIsInR5cGUiOiJKc29uU2NoZW1hVmFsaWRhdG9yMjAxOCJ9fSwiZXhwIjoxNjAxNTgwMjA0LCJuYmYiOjE1Njk5NTc4MDQsImlhdCI6MTU3MTQyNTkxOX0.vhbKS-sNoNUeQfOROW3lvpv5-Nv-9kYKyOoKAH1JGQLe71nSjhtmkrdmN-h3B5AZZD9NMQeXL2lR9TTiQQP2AQ";
});

// **** setup a 404 handler *****

// eslint-disable-next-line no-unused-vars
app.use(function(req, res, next) {
  res.status(404).send("Sorry can't find that!");
});


app.listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}`));