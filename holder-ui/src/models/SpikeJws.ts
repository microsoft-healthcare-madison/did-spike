import { ContactPoint } from "../util/fhir_selected";


export interface SpikeJwsVcResource {
  resourceType: string;
  id: string;
}

export interface SpikeJwsVcFhirResourcePointer {
  fhirServerUrl: string;
  resource: SpikeJwsVcResource;
}

export interface SpikeJwsVcSubject {
  hasVerifiedContactPoint: ContactPoint;
  hasAccessToFhirResource: SpikeJwsVcFhirResourcePointer;
}

export interface SpikeJwsVcSchema {
  id: string;
  type: string;
}

export interface SpikeJwsVc {
  '@context': string[];
  type: string[];
  credentialSubject: SpikeJwsVcSubject;
  credentialSchema: SpikeJwsVcSchema;
}

export default interface SpikeJws {
  iss: string;
  jti: string;
  sub: string;
  vc: SpikeJwsVc;
  exp: number;
  nbf: number;
}