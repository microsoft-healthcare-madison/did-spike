import { ContactPoint } from "../util/fhir_selected";

export interface SpikeVcResource {
  resourceType: string;
  id: string;
}

export interface SpikeVcFhirResourcePointer {
  fhirServerUrl: string;
  resource: SpikeVcResource;
}

export interface SpikeVcSubject {
  id: string;
  hasVerifiedContactPoint: ContactPoint;
  hasAccessToFhirResource: SpikeVcFhirResourcePointer;
}

export interface SpikeVcSchema {
  id: string;
  type: string;
}

export default interface SpikeVc {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: Date;
  expirationDate: Date;
  credentialSubject: SpikeVcSubject;
  credentialSchema: SpikeVcSchema;
}