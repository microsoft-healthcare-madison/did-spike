import { ContactPoint } from "../util/fhir_selected";

export default interface VerificationRequest {
  fhirBaseUrl: string;
  authToken: string;
  resourceType: string;
  resourceId: string;
  contactPoint: ContactPoint;
  verificationMethod: string;
}