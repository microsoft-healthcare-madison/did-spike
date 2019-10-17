import { createIdentity } from 'nacl-did';
import { TranscriptionContext } from 'twilio/lib/rest/api/v2010/account/transcription';

//const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors');
const express = require('express');
const uuid = require('uuid');
const events = require('events');

const app = express();

const _eventType = {
  INITIALIZED: 'INITIALIZED'
}

const _verificationStates = {
  /** Request recveived */
  INIT: 'INIT',
  /** Request LOOKS valid (superficial checks) */
  ESTABLISHED: 'ESTABLISHED',
  /** FHIR Resource has been pulled from the speicified server */
  FHIR_RETRIEVED: 'FHIR_RETRIEVED',
  /** Contact point in request exists in FHIR resource */
  FHIR_VERIFIED: 'FHIR_VERIFIED',
  /** Waiting on user to input code */
  CONTACT_VERIFYING: 'CONTACT_VERIFYING',
  /** Done! */
  CONTACT_VERIFIED: 'CONTACT_VERIFIED',
  /** Failed! */
  ERROR: 'ERROR',
}

const _stateEvents = {
  
}

const _errors = {
  INVALID_ARGUMENT: 
    {errorCode: -1, errorType: 'Invalid arguments'},
  FAILED_TO_CONNECT_TO_FHIR_SERVER: 
    {errorCode: -2, errorType: 'Failed to connect to FHIR Server'},
  CONTACT_POINT_NOT_FOUND:
    {errorCode: -3, errorType: 'Contact not present in FHIR resource'},
  RESOURCE_NOT_FOUND:
    {errorCode: -4, errorType: 'FHIR Resource not found'},
  FAILED_PHONE_VERIFICATION:
    {errorCode: -5, errorType: 'Phone verification failed'}
};


// **** use PORT env variable or 3000 ****
const port = process.env.PORT || 3000;


const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  serviceId: process.env.TWILIO_SERVICE_ID,
}

const twilioClient = require('twilio')(twilioConfig.accountSid, twilioConfig.authToken);

const identity = createIdentity();

const verifications = new Map();

const fhirPatientHasContactPoint = (patient, contactPoint) =>
  (patient.telecom || []).filter(t => (
    t.system === contactPoint.system &&
    t.value === value.use &&
    t.use === contactPoint.use &&
    t.use !== 'old'
  )).length > 0

const genReturn = (success, error, details) => {
  if (success) {
    return {type: 'success'};
  }
  return {type: 'error', error: {...error, errorDetails: details}};
}

const _success = genReturn(true, null, null);

class VerificationRequest {
  constructor(request) {
    this.creationTs = Date.now();
    this.id = uuid.v4();
    this.request = request;
    verifications.set(this.id, this);
    this.challenge = null;
    this.retrievedFhirResourceBody = null;
    this.state = _verificationStates.INIT;
    this.error = {};
    this.establish().then(result => this.processEvent(result))
  }

  async processEvent(incomingEvent){
    const [delta, nextFn] = this.transitionsForEvent( {state: this.state, error: this.error }, incomingEvent)
    
    if (delta.state) {this.state = delta.state}
    if (delta.error) {this.error = delta.error}
    if (nextFn) {
      const nextEvent = nextFn();
      this.processEvent(nextEvent)
    }

  }


  async transitionsForEvent(current, incomingEvent) {

    const terminalStates = [_verificationStates.ERROR, _verificationStates.CONTACT_VERIFIED]

    const handlerForState = {
      [_verificationStates.INIT]: {
        transitions: {
          'success': [{state: _verificationStates.ESTABLISHED}, () => this.tryGetFhirResource()],
          'error': [{state: _verificationStates.ERROR, error: incomingEvent.error}]
        }
      },
      [_verificationStates.ESTABLISHED]: {
        transitions: {
          'success': [{state: _verificationStates.FHIR_RETRIEVED}, () => this.tryValidateResourceClaim](),
          'error': [{state: _verificationStates.ERROR, error: incomingEvent.error}]
        }
      },
      [_verificationStates.FHIR_RETRIEVED]: {
        transitions: {
          'success': [{state: _verificationStates.FHIR_VERIFIED}, () => this.issueChallenge()],
          'error': [{state: _verificationStates.ERROR, error: incomingEvent.error}]
        }
      },
      [_verificationStates.FHIR_VERIFIED]: {
        transitions: {
          'success': [{state: _verificationStates.CONTACT_VERIFYING}],
          'error': [{state: _verificationStates.ERROR, error: incomingEvent.error}]
        }
      },
      [_verificationStates.CONTACT_VERIFYING]: {
        transitions: {
          'success': [{state: _verificationStates.CONTACT_VERIFIED}],
          'error': [{state: _verificationStates.ERROR, error: incomingEvent.error}]
        }
      }
    }

    const handler = handlerForState[current.state]
    return handler.transitions[incomingEvent.type]
  }
  

  /**
   * Basic check to ensure the request is valid
   */
  async establish() {
    // **** sanity checks ****

    if (!this.request) {
      return genReturn(false, _errors.INVALID_ARGUMENT, 'Request not found')
    }

    if (!this.request.fhirBaseUrl) {
      return genReturn(false, _errors.INVALID_ARGUMENT, 'No FHIR server URL');
    }

    if (!this.request.resourceType) {
      return genReturn(false, _errors.INVALID_ARGUMENT, 'No FHIR Resource Type');
    }

    if (!this.request.resourceId) {
      return genReturn(false, _errors.INVALID_ARGUMENT, 'No FHIR Resource ID');
    }

    // **** success ****

    return (_success);
  }
  

  /**
   * Check to see if we can access the FHIR server and pull the specified resource
   */
  async tryGetFhirResource() {
    // **** build the URL for our request ****

    let url = new URL(
      `${this.request.resourceType}/${this.request.resourceId}`,
      this.request.fhirBaseUrl
    ).toString();

    // **** build the headers for our FHIR request ****

    let headers = new Headers();
    headers.append('Accept', 'application/fhir+json');
    headers.append('Authorization', this.request.authToken);

    // **** issue our request ****

    let response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    // **** check for status ****

    if (response.ok) {
      // **** grab the body of the response ****

      this.retrievedFhirResourceBody = await response.text();

      if (!this.retrievedFhirResourceBody) {
        return genReturn(false, _errors.RESOURCE_NOT_FOUND, `Request to ${url} returned no content.`);
      }

      // **** success ****

      return (_success);
    }

    // **** flag our error ****
    return genReturn(
      false, 
      _errors.FAILED_TO_CONNECT_TO_FHIR_SERVER, 
      `Request to ${url} failed: `+
        `${response.statusCode} - ${response.statusMessage}`
      );
  }

  /**
   * Check a retrieved resource against the verification info
   */
  tryValidateResourceClaim() {
    // **** act depending on resource type ****

    switch (this.request.resourceType) {
      case 'Patient':
        if (fhirPatientHasContactPoint(
          this.retrievedFhirResourceBody,
          this.request.contactPoint
        )) {
          return (_success);
        }

        return genReturn(
          false, 
          _errors.CONTACT_POINT_NOT_FOUND, 
          `Contact point not found! ${JSON.stringify(this.request.contactPoint)}`
          );
        // break;
    }

    // **** unknown resource type, cannot verify ****

    return genReturn(
      false, 
      _errors.INVALID_ARGUMENT, 
      `Unsupported resource type: ${this.request.resourceType}`
      );
  }

  async issueChallenge() {
    // TODO: raise an exception if Twilio is down or the challenge fails to send
    const twilioResponse = await twilioClient
      .verify.services(twilioConfig.serviceId)
      .verifications
      .create({
        to: this.request.contactPoint.value,
        channel: this.request.verifyMethod
      })
    
    console.log("Twilio issued", twilioResponse)
    return genReturn(true)
  }

  async processChallengeResponse() {
    // TODO: pass a challenge response back through Twilio
    const twilioResponse = await twilioClient.verify.services(twilioConfig.serviceId)
      .verificationChecks
      .create({
        to: this.request.contactPoint.value,
        code: this.request.verifyMethod
      })

    console.log("Verification resposne from twilio; got", twilioResponse)
    return (twilioResponse.status === 'approved')
  }
}

const confirm = async (req, res) => {
  const {verificationId, verificationCode} = identity.decrypt(req.body);
  // TODO: raise an exception if the body fails decryption.

  if (!verifications.has(verificationId)) {
    res.send('LOL WUT - I dont know your verification id: ' + verificationID);
    return; // XXX - raise an excecption?
  }
  const verification = verifications.get(verificationId);
  const contactPointVerified = await verification.processChallengeResponse()

  let event = genReturn(true)
  if (!contactPointVerified){
      event = genReturn(false, _errors.FAILED_PHONE_VERIFICATION, 'Failed phone verification')
  }

  verification.processEvent(event)
};


const debug = (req, res) => {
  res.send('<pre>' + JSON.stringify(identity, null, 2) + '</pre>');
}

const did = (req, res) => {
  res.send(identity.did);
}

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

  const request = new VerificationRequest(plain);

  // TODO: should the response be encrypted using the UI's DID?
  res.send(request.id);
}

app.use(cors());

app.use(function addDidResponseHeader(req, res, next) {
  res.set('did', identity.did);
  next();
});

app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());

app.get('/', (req, res) => res.json(identity));
app.post('/confirm', confirm);
app.get('/did', did);
app.get('/debug', debug);
app.get('/check')
app.post('/verify', verify);

app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
});

app.listen(port, () => console.log(`http://localhost:${port}`));