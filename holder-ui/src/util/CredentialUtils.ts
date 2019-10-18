import SpikeVc from "../models/SpikeVc";
import SpikeJws from "../models/SpikeJws";
import { verifyJWT, VerifiedJWT } from "nacl-did";

const deepCopy = (a: any) => JSON.parse(JSON.stringify(a));

const unixToIso = (s: number) => new Date(s * 1000).toISOString();
const isoToUnix = (s: string) => Date.parse(s.trim()) / 1000;

export default class CredentialUtils {

  /**
   * Shorthand to return false, but with logging (for cleaner code below)
   */
  static validationFailureWithLog = (reason:string) => {
    console.log(reason);
    return false;
  }

  /**
   * Check that a given field or field.subfield exists, log if not, and return true/false
   * @param credential 
   * @param field 
   * @param subfield 
   */

  static checkRequiredField(credential: any, field:string, subfield?:string) {
    if (subfield) {
      if (!credential[field][subfield]) {
        console.log(`Validation failed: credential is missing required field: ${field}.${subfield}`);
        return false;
      }
      return true;
    }
    if (!credential[field]) {
      console.log(`Validation failed: credential is missing required field: ${field}`);
      return false;
    }
    return true;
  }

  /**
   * Validate a verifiable credential
   * @param credential 
   */

  static validateVc(credential: SpikeVc):boolean {

    // **** make sure we have a credential ****

    if (!credential) return this.validationFailureWithLog('Validation failed: credential is undefined');

    // **** check for required fields ****

    if (!this.checkRequiredField(credential, '@context')) return false;
    if (!this.checkRequiredField(credential, 'type')) return false;
    if (!this.checkRequiredField(credential, 'issuer')) return false;
    if (!this.checkRequiredField(credential, 'issuanceDate')) return false;
    if (!this.checkRequiredField(credential, 'expirationDate')) return false;
    if (!this.checkRequiredField(credential, 'credentialSubject')) return false;
    if (!this.checkRequiredField(credential, 'credentialSubject', 'id')) return false;

    // **** check we are past the issuance date and before the expiration date ****

    if (Date.now() < credential.issuanceDate.getTime())
      return this.validationFailureWithLog('Validation failed: issuanceDate is in the future');
    if (Date.now() > credential.expirationDate.getTime())
      return this.validationFailureWithLog('Validation failed: expirationDate is in the past');

    // **** check resource type based on credential ****

    if ('FhirPatientCredential' in credential.type) {
      if (credential.credentialSubject.hasAccessToFhirResource.resource.resourceType !== 'Patient')
        return this.validationFailureWithLog('Validation failed: FhirPatientCredential requires Patient resource');
      if (!credential.credentialSubject.hasAccessToFhirResource.resource.id)
        return this.validationFailureWithLog('Validation failed: FhirPatientCredential requires resource.id');
    }

    // **** success ****

    return true;
  }

  static validateJws(jws: SpikeJws):boolean {

    // **** make sure we have a JWS ****

    if (!jws) return this.validationFailureWithLog('Validation failed: JWS is undefined');

    // **** check for required fields ****

    if (!this.checkRequiredField(jws, 'iss')) return false;
    if (!this.checkRequiredField(jws, 'jti')) return false;
    if (!this.checkRequiredField(jws, 'sub')) return false;
    if (!this.checkRequiredField(jws, 'exp')) return false;
    if (!this.checkRequiredField(jws, 'nbf')) return false;
    if (!this.checkRequiredField(jws, 'vc')) return false;
    if (!this.checkRequiredField(jws, 'vc', '@context')) return false;
    if (!this.checkRequiredField(jws, 'vc', 'type')) return false;
    if (!this.checkRequiredField(jws, 'vc', 'credentialSubject')) return false;
    if (!this.checkRequiredField(jws, 'vc', 'credentialSchema')) return false;

    // **** check we are past the issuance date and before the expiration date ****

    if (Date.now() < (jws.nbf * 1000))
      return this.validationFailureWithLog('Validation failed: nbf (not before) is in the future');
    if (Date.now() > (jws.exp * 1000))
      return this.validationFailureWithLog(`Validation failed: exp (experation - ${jws.exp}) is in the past (< ${Date.now()})`);

    // **** success ****

    return true;
  }

  static jwsToVc(jws: any):SpikeVc|null {
    if (!jws) return null;

    // **** validate our jws ****

    if (!this.validateJws(jws)) {
      console.log('Could not convert JWS - validation failed');
      return null;
    }

    // **** create our vc ****

    return {
      ...deepCopy(jws.vc),
      issuer: jws.iss,
      id: jws.jti,
      credentialSubject: {
        ...deepCopy(jws.vc.credentialSubject),
        id: jws.sub
      },
      expirationDate: unixToIso(jws.exp),
      issuanceDate: unixToIso(jws.nbf),
    }
  }
  
} 