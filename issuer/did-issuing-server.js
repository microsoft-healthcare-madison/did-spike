//const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const uuid = require('uuid');
const app = express();

// **** use PORT env variable or 3000 ****
const port = process.env.PORT || 3000;

import { createIdentity } from 'nacl-did';

const identity = createIdentity();

const verifications = new Map();

class VerificationRequest {
  constructor(request) {
    this.creationTs = Date.now();
    this.id = uuid.v4();
    this.request = request;
    verifications.set(this.id, this);
    this.challenge = null;
  }

  establish() {
    if (!this.verifyFhirServerAccess()) {
      // TODO: failed to access server - we won't be sending any SMS messages
      return false;
    }
    this.challenge = this.issueChallenge();
  }

  verifyFhirServerAccess() {
    // TODO: confirm FHIR server access
    return true;  // XXX
  }

  issueChallenge() {
    // TODO: create (and send) a request through Twilio
    // TODO: raise an exception if Twilio is down or the challenge fails to send
    return null;  // XXX
  }

  processChallengeResponse(res) {
    // TODO: pass a challenge response back through Twilio
    return true;  // XXX
  }
}

const confirm = (req, res) => {
  const plain = identity.decrypt(req.body);
  // TODO: raise an exception if the body fails decryption.
  const verificationID = plain.verificationID;
  if (!verifications.has(verificationID)) {
    res.send('LOL WUT - I dont know your verification id: ' + verificationID);
    return;  // XXX - raise an excecption?
  }
  const verification = verifications.get(verificationID);
  if (!verification.processChallengeResponse(req.body)) {
    res.send('That code failed to pass the challenge response');
    return;  // XXX - raise an exception?
  }
};

// TODO: determine if app.all can be used to insert response headers without
//       requiring any changes at the other handlers.
function decorate(res) {
  return res.set('did', identity.did);
}

const debug = (req, res) => {
  decorate(res).send('<pre>' + JSON.stringify(identity, null, 2) + '</pre>');
}

const did = (req, res) => {
  decorate(res).send(identity.did);
}

const verify = (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));  // XXX
  // TODO: decrypt the request using the identity.
  const plain = identity.decrypt(req.body);
  console.log(JSON.stringify(plain, null, 2));  // XXX
  const request = new VerificationRequest(plain);
  // TODO: should the response be encrypted using the UI's DID?
  if (request.establish()) {
    decorate(res).send(request.id);
  }
}

app.use(cors());
app.use(express.urlencoded({extended: true}));
app.use(express.json());


app.get('/', (req, res) => res.json(identity));
app.post('/confirm', confirm);
app.get('/did', did);
app.get('/debug', debug);
app.post('/verify', verify);

app.use(function (req, res, next) {
  decorate(res).status(404).send("Sorry can't find that!")
});

app.listen(port, () => console.log(`http://localhost:${port}`));
