//const bodyParser = require('body-parser');
import  fetch, {Headers} from 'node-fetch'
const cors = require('cors');
const express = require('express');
const uuid = require('uuid');
const events = require('events');

import createStore from 'storeon'
import { createIdentity } from 'nacl-did';
import { TranscriptionContext } from 'twilio/lib/rest/api/v2010/account/transcription';


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
  (patient.telecom || []).filter(t =>  {
    return (t.system === contactPoint.system &&
    t.value === contactPoint.value &&
    t.use === contactPoint.use &&
    t.use !== 'old'
  )
  }
).length > 0


const confirm = async (req, res) => {
  const {verificationId, verificationCode} = identity.decrypt(req.body);
  // TODO: raise an exception if the body fails decryption.

  if (!verifications.has(verificationId)) {
    res.send('LOL WUT - I dont know your verification id: ' + verificationID);
    return; // XXX - raise an excecption?
  }
  const verification = verifications.get(verificationId);
  const contactPointVerified = await verification.processChallengeResponse()

  if (!contactPointVerified){
      return ['verifications/failed', {
        id: v.id,
        code: _errors.FAILED_PHONE_VERIFICATION,
        detail: "Failed phone verification"
      }]
  }
  return ['verifications/complete-verify-phone', { id: v.id, }]
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
  const v = createVerification(plain)
  store.dispatch('verifications/add', v)

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



const createVerification = (request) => ({
    creationTs: Date.now(),
    id: uuid.v4(),
    request: request,
    challenge: null,
    retrievedFhirResourceBody: null,
    status: _verificationStates.INIT,
    error: null
})

const store = createStore([store => {
  store.on('@init', () => {
    return {verifications: {}}
  })

  store.on('verifications/add', ({verifications}, v) => ({
    verifications: {...verifications, ...{
      [v.id]: v
    }}
  }))

  store.on('verifications/establish', ({verifications}, { id }) => ({
    verifications: {
      ...verifications,
      [id]: {
        ...verifications[id],
        status: _verificationStates.ESTABLISHED
      }
    }
  }));

  store.on('verifications/verify-fhir', ({verifications}, { id }) => ({
    verifications: {
      ...verifications,
      [id]: {
        ...verifications[id],
        status: _verificationStates.FHIR_VERIFIED
      }
    }
  }));

  store.on('verifications/begin-verify-phone', ({verifications}, { id }) => ({
    verifications: {
      ...verifications,
      [id]: {
        ...verifications[id],
        status: _verificationStates.CONTACT_VERIFYING
      }
    }
  }));

  store.on('verifications/complete-verify-phone', ({verifications}, { id }) => ({
    verifications: {
      ...verifications,
      [id]: {
        ...verifications[id],
        status: _verificationStates.CONTACT_VERIFIED
      }
    }
  }));


  store.on('verifications/failed', ({verifications}, {id, error, detail}) => ({
    verifications: {
      ...verifications,
      [id]: {
        ...verifications[id],
        status: _verificationStates.ERROR,
        error,
        detail
      }
    }
  }));

}])

async function verificationFhirResource(v) {

  let url = new URL(
    `${v.request.resourceType}/${v.request.resourceId}`,
    v.request.fhirBaseUrl
  ).toString();

  // **** build the headers for our FHIR request ****

  let headers = new Headers();
  headers.append('Accept', 'application/fhir+json');
  headers.append('Authorization', v.request.authToken);

  // **** issue our request ****

  let response = await fetch(url, {
    method: 'GET',
    headers: headers,
  });

  // **** check for status ****

  if (!response.ok) {
      return ['verifications/failed', {
        id: v.id,
        code: _errors.FAILED_TO_CONNECT_TO_FHIR_SERVER,
        detail: `Request to ${url} failed: ${response.status} - ${response.statusText}`
      }]
  }

    // **** grab the body of the response ****

    const resourceBody = await response.json();

    if (!resourceBody) {
      return ['verifications/failed', {
        id: v.id,
        code: _errors.RESOURCE_NOT_FOUND,
        detail: `Request to ${url} returned no content.`
      }]
    }

    return tryValidateResourceClaim(v, resourceBody)

}

  /**
   * Check a retrieved resource against the verification info
   */
  function tryValidateResourceClaim(v, resourceBody) {
    // **** act depending on resource type ****

    switch (resourceBody.resourceType) {
      case 'Patient':
        if (fhirPatientHasContactPoint(
          resourceBody,
          v.request.contactPoint
        )) {
          return ['verifications/verify-fhir', {
            id: v.id,
            resourceBody
          }];
        }
        return ['verifications/failed', {
          id: v.id,
          code:  _errors.CONTACT_POINT_NOT_FOUND,
          detail: `Contact point not found! ${JSON.stringify(v.request.contactPoint)}`
      }]
   }

    // **** unknown resource type, cannot verify ****
        return ['verifications/failed', {
          id: v.id,
          code:  _errors.INVALID_ARGUMENT,
          detail: `Unsupported resource type: ${v.request.resourceType}`
      }]
  }


const verificationEstablish = async v => {
  console.log("going to establish", v)
    // **** sanity checks ****

    if (!v.request) {
    return ['verifications/failed', {
      id: v.id,
      code: _errors.INVALID_ARGUMENT,
      detail: 'Request not found'
    }]
    }

    if (!v.request.fhirBaseUrl) {
    return ['verifications/failed', {
      id: v.id,
      code: _errors.INVALID_ARGUMENT,
      detail: 'No FHIR Server URL'
    }]
    }

    if (!v.request.resourceType) {
    return ['verifications/failed', {
      id: v.id,
      code: _errors.INVALID_ARGUMENT,
      detail: 'No FHIR Resource Type'
    }]

    }

    if (!v.request.resourceId) {
    return ['verifications/failed', {
      id: v.id,
      code: _errors.INVALID_ARGUMENT,
      detail: 'No FHIR Resource ID'
    }]
    }

    // **** success ****

    return ['verifications/establish', {
      id: v.id
    }]

}
async function issueChallenge(v) {
    // TODO: raise an exception if Twilio is down or the challenge fails to send
    console.log("Twilio issue", v.request.contactPoint.value, v.request.verifyMethod)
    try {
    const twilioResponse = await twilioClient
      .verify.services(twilioConfig.serviceId)
      .verifications
      .create({
        to: v.request.contactPoint.value,
        channel: v.request.verifyMethod
      })
      console.log("Twilio issued", twilioResponse)

    } catch(err) {
      console.log("Twilio err", err)
      return ['verifications/failed', {
        id: v.id,
        code: _errors.FAILED_PHONE_VERIFICATION,
        detail: `Could not create verification request for ${v.request.contactPoint.value}: ${err}`
      }]


    }
    return ['verifications/begin-verify-phone', { id: v.id, }];
 }

store.on("@changed", (...args) =>  {
  console.log("Changed", store.get())
})

store.on("@dispatch", async (state, [event, data]) => {
  if (event === 'verifications/add') {
    const nextResult = await verificationEstablish(data);
    store.dispatch(...nextResult)
  } else if (event === 'verifications/establish') {
    const nextResult = await verificationFhirResource(state.verifications[data.id]);
    store.dispatch(...nextResult)
  } else if (event === 'verifications/verify-fhir') {
    const nextResult = await issueChallenge(state.verifications[data.id]);
    store.dispatch(...nextResult)
  }

})

const v = createVerification({
  fhirBaseUrl: "https://r4.smarthealthit.org",
  resourceType: "Patient",
  resourceId: "835a3b08-e3b6-49c4-a23f-1fac8dc7a7a7",
  contactPoint: { system: 'phone', value: '555-258-5879', use: 'home' },
  verifyMethod: 'sms'
})

store.dispatch('verifications/add', v)
