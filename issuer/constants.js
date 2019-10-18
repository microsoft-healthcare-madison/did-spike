export const _verificationStates = {
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

export const _errors = {
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

