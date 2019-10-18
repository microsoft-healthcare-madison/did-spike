import  fetch, {Headers} from 'node-fetch'
import { _errors, _verificationStates } from "./constants";
const uuid = require("uuid");


export const fhirPatientHasContactPoint = (patient, contactPoint) =>
  (patient.telecom || []).filter(t =>  {
    return (t.system === contactPoint.system &&
    t.value === contactPoint.value &&
    t.use === contactPoint.use &&
    t.use !== 'old'
  )
  }
).length > 0


export async function verificationFhirResource(v) {

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


export const verificationEstablish = async v => {
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
export async function issueChallenge(v, twilioService) {
    // TODO: raise an exception if Twilio is down or the challenge fails to send
    console.log("Twilio issue", v.request.contactPoint.value, v.request.verifyMethod)
    try {
    const twilioResponse = await twilioService
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

 export async function processChallengeResponse(v, twilioService) {
   // TODO: pass a challenge response back through Twilio
   const twilioResponse = await twilioService
     .verificationChecks
     .create({
       to: v.request.contactPoint.value,
       code: v.request.verifyMethod
     })

     if (twilioResponse.status !== 'approved') {
      return ['verifications/failed', {
        id: v.id,
        code: _errors.FAILED_PHONE_VERIFICATION,
        detail: "Failed phone verification"
      }]

     }

    return ['verifications/complete-verify-phone', { id: v.id, }]
 }

export const createVerification = (request) => ({
    creationTs: Date.now(),
    id: uuid.v4(),
    request: request,
    challenge: null,
    retrievedFhirResourceBody: null,
    status: _verificationStates.INIT,
    error: null
})

