import { ContactPoint } from "../util/fhir_selected";

export default interface VerificationRequest {
  holderDid: string;
  fhirBaseUrl: string;
  authToken: string;
  resourceType: string;
  resourceId: string;
  contactPoint: ContactPoint;
  verificationMethod: string;
  issuedCredential?: string;
  status?: string;
}