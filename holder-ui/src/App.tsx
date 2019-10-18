import React, { useEffect, useState, useRef } from 'react';

import './App.css';

import { createIdentity, NaCLIdentity, Encrypted, loadIdentity, verifyJWT, VerifiedJWT } from 'nacl-did'

import { Stepper, StepLabel, Step, Button } from '@material-ui/core';

import FHIR from 'fhirclient';

import GenerateDid from './steps/GenerateDID';
import ConnectToProvider from './steps/ConnectToProvider';
import SelectVerification from './steps/SelectVerification';
import VerificationRequest from './models/VerificationRequest';
import { ContactPoint } from './util/fhir_selected';
import EnterCode from './steps/EnterCode';
import ShowCredential from './steps/ShowCredential';
import { ConfirmationRequest } from './models/ConfirmationRequest';
import CredentialUtils from './util/CredentialUtils';
import SpikeVc from './models/SpikeVc';
import WaitOnConfirmation from './steps/WaitOnConfirmation';

// **** extend the Window to include our _env settings ****

declare global {
  interface Window { _env?:any }
}

export default function App() {

  const steps:string[] = [
    'Create a DID',           // 0
    'Connect to a Provider',  // 1
    'Select Verification',    // 2
    'Enter Code',             // 3
    'Wait on Confirmation',   // 4
    'Done'                    // 5
  ];

  const initialLoadRef = useRef<boolean>(true);
  const fhirClientRef = useRef<any>();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [identity, setIdentity] = useState<NaCLIdentity>();
  const [selectedProvider, setSelectedProvider] = useState<string>();
  const [verificationContactPoint, setVerificationContactPoint] = useState<ContactPoint>();
  const [verificationMethod, setVerificationMethod] = useState<string>('sms');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [credential, setCredential] = useState<SpikeVc>();
  const [verificationId, setVerificationId] = useState<string>('');

  useEffect(() => {
    if (initialLoadRef.current) {
      // **** check to see if local storage has a did ****

      if (localStorage.getItem('did')) {
        // **** use the existing identity ****

        setIdentity(loadIdentity(JSON.parse(localStorage.getItem('did')!)));
      } else {
        // **** create an identity ****

        const genId:NaCLIdentity = createIdentity();

        // **** set for local use ****

        setIdentity(genId);

        // **** save for later use ****

        localStorage.setItem('did', JSON.stringify(genId));
      }

      // **** check for stored provider URL ****

      if (localStorage.getItem('providerUrl')) {
        setSelectedProvider(localStorage.getItem('providerUrl')!);
        console.log('App.useEffect, loaded provider URL', localStorage.getItem('providerUrl'));
      }

      // **** check for a SMART return ****

      const urlParams = new URLSearchParams(window.location.search);

      if (urlParams.has('code')) {
        // **** check for SMART launch return ****

        FHIR.oauth2.ready()
          .then(client => {
            // **** set our fhir client ****

            fhirClientRef.current = client;

            // **** log client for now (debug) ****

            console.log('SMART Client', client);

            // **** move to third step (zero-based) ****

            setActiveStep(2);
          });
      }

      // **** no longer first pass ****

      initialLoadRef.current = false;
    }
  }, []);

  function handleBack() {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  }

  function smartLaunch() {
    FHIR.oauth2.authorize({
      'client_id': 'did_spike_holder',
      'scope': 'patient/Patient.read, launch/patient',
      'iss': selectedProvider,
    });
  }

  async function getIssuerDid() {

    // **** ask the server for a DID to encrypt my request ****

    let didUrl:string = new URL('/did', window._env.Issuer_Public_Url).toString();

    // **** prepare our request ****

    let didHeaders: Headers = new Headers();
    didHeaders.append('Accept', 'text/plain');

    let didResponse: Response = await fetch(didUrl, {
      method: 'GET',
      headers: didHeaders,
    });

    // **** check for successful response ****

    if (!didResponse.ok) {
      window.alert(`DID request failed (${didResponse.status} - ${didResponse.statusText})`);
      return undefined;
    }

    return await didResponse.text();
  }


  async function requestVerification() {
    // **** get our issuer DID ****

    let issuerDid = await getIssuerDid();

    if (!issuerDid) {
      return;
    }

    // **** build our verification request ****

    let request:VerificationRequest = {
      holderDid: identity!.did,
      fhirBaseUrl: fhirClientRef.current.state.serverUrl,
      authToken: fhirClientRef.current.state.tokenResponse.access_token,
      resourceType: 'Patient',
      resourceId: fhirClientRef.current.patient.id,
      contactPoint: verificationContactPoint!,
      verificationMethod: verificationMethod
    }

    // **** log verification data for now (debug) ****
    
    console.log('Verify', request);

    // **** encrypt our data for the issuer ****

    let encrypted:Encrypted = await identity!.encrypt(issuerDid, JSON.stringify(request));

    console.log('Encrypted', encrypted);

    // **** build the URL to POST to ****

    let url:string = new URL('/CredentialRequest/new', window._env.Issuer_Public_Url).toString();

    console.log('URL', url);
 
    // **** prepare our request ****

    let headers: Headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');

    let response: Response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(encrypted),
    });

    // **** check for successful response ****

    if (response.ok) {
      // **** grab the body ****

      let encryptedBody: string = await response.text();

      let body: string = identity!.decrypt(JSON.parse(encryptedBody)!);

      // **** log the response for now (debug) ****
  
      console.log('Verification id:', body);

      // **** set our verification id ****

      setVerificationId(body);
  
      // **** move to next step ****
  
      setActiveStep(activeStep + 1);

      return;
    }

    // **** request failed ****

    console.log('Request failed', response);
    window.alert(`Verification request failed (${response.status} - ${response.statusText})!`);
  }

  async function checkVerificationCode() {
    // **** get our issuer DID ****

    let issuerDID = await getIssuerDid();

    if (!issuerDID) {
      return;
    }
    
    // **** build our verification confirmation request ****

    let request:ConfirmationRequest = {
      verificationId: verificationId,
      verificationCode: verificationCode,
    }

    console.log('checkVerificationCode.request', request);

    // **** encrypt our data for the issuer ****

    let encrypted:Encrypted = await identity!.encrypt(issuerDID, JSON.stringify(request));

    console.log('checkVerificationCode.encrypted', encrypted);

    // **** build the URL to POST to ****

    let url:string = new URL('/confirm', window._env.Issuer_Public_Url).toString();

    console.log('checkVerificationCode.url', url);
 
    // **** prepare our request ****

    let headers: Headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');

    let response: Response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(encrypted),
    });

    // // **** get the encrypted body ****

    // let encryptedBody: string = await response.text();

    // let body: string = identity!.decrypt(JSON.parse(encryptedBody));

    // **** check for successful response ****

    if (response.ok) {
      console.log('checkVerificationCode ok!');

      // **** move to next step ****

      setActiveStep(activeStep + 1);

      return;
    }

    // **** request failed ****

    console.log('checkVerificationCode Request failed', response);
    window.alert(`Confirmation request failed (${response.status})!`);
  }

  async function checkVerificationState():Promise<boolean> {
    // **** get our issuer DID ****

    let issuerDID = await getIssuerDid();

    if (!issuerDID) {
      return false;
    }
    
    // **** build our verification confirmation request ****

    let request:any = {
      id: verificationId,
    }

    console.log('checkVerificationState.request', request);

    // **** encrypt our data for the issuer ****

    let encrypted:Encrypted = await identity!.encrypt(issuerDID, JSON.stringify(request));

    console.log('checkVerificationState.encrypted', encrypted);
    
    // **** build the URL to for our status ****

    let url:string = new URL('/credentialrequest/status', window._env.Issuer_Public_Url).toString();

    console.log('checkVerificationState.url', url);

    // **** prepare our request ****

    let headers: Headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');

    let response: Response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(encrypted),
    });

    // **** check for successful response ****

    if (response.ok) {
      // **** grab the returned content ****

      let encryptedBody:any = JSON.parse(await response.text());

      console.log('checkVerificationState.encryptedBody', encryptedBody);

      // **** decrypt the data ****

      let body:string = identity!.decrypt(encryptedBody);

      // **** check our state ****

      let status:VerificationRequest = JSON.parse(body);

      console.log('checkVerificationState.status', status);

      // **** check for an issued credential ****

      if (status.issuedCredential) {
        // **** check this JWT ****

        if (await processJwt(status.issuedCredential)) {

          return true;
        }
      }

      if (status.status === 'ERROR') {
        window.alert('Invalid code, please try again')
        setActiveStep(2);
        return true;
      }
    }

    return false;
  }

  async function processJwt(content: string):Promise<boolean> {
    console.log('ProcessJwt content:', content);

    // **** verify the JWT ****

    let jwt:VerifiedJWT = verifyJWT(content);

    if (!jwt) {
      window.alert('Invalid JWT!');
      return false;
    }

    if (!jwt.payload) {
      window.alert('JWT has no payload!');
      return false;
    }

    // **** check the payload ****

    if (!CredentialUtils.validateJws(jwt.payload)) {
      window.alert('Invalid JWT Payload!');
      return false;
    }

    let vc = CredentialUtils.jwsToVc(jwt.payload);

    if (!vc) {
      window.alert('JWT Payload cannot be converted to a Verifiable Credential!');
      return false;
    }
    // **** set our credential ****

    setCredential(vc);

    // **** move to next step ****

    setActiveStep(activeStep + 1);

    return true;
  }

  function handleNext() {

    // **** act depending on current step ****

    switch (activeStep) {
      case 1:
        smartLaunch();
        break;

      case 2:
        requestVerification();
        break;

      case 3:
        checkVerificationCode();
        break;

      case 4:
        break;


      default:
        if ((activeStep + 1) < steps.length) {
          setActiveStep(activeStep + 1);
        }
        break;
    }
  }

  function handleReset() {
    setActiveStep(0);
  }

  function contentForStep() {
    switch (activeStep) {
      case 0:
        return (
          <GenerateDid
            identity = {identity}
            setIdentity = {setIdentity}
            />
          );
        // break;
      case 1:
        return (
          <ConnectToProvider
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            />
        );
        // break;
      case 2:
        return (
          <SelectVerification
            fhirClient={fhirClientRef.current}
            setVerificationContactPoint={setVerificationContactPoint}
            setVerificationMethod={setVerificationMethod}
            />
        );
        // break;
      case 3:
        return (
          <EnterCode
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            />
        );
        // break;
      case 4:
        return (
          <WaitOnConfirmation
            checkVerificationState={checkVerificationState}
            />
        );
        // break;
      case 5:
        return (
          <ShowCredential
            credential={credential}
            />
        );
        // break;
      default:
        return ('Not implemented');
        // break;
    }
  }

  function isNextDisabled() {
    switch (activeStep) {
      case 0:
        return (identity === undefined);
        // break;
      case 1:
        return (selectedProvider === undefined);
        // break;
      case 2:
        return (verificationContactPoint === undefined);
        // break;
      case 3:
        return (verificationCode === '');
        // break;
      default:
        return (false);
        // break;
    }
  }

  return(
    <div className='App'>

      <Stepper
        activeStep={activeStep}
        >
        {steps.map((label, index) => {
          const stepProps:any = {};
          if (index < activeStep) {
            stepProps.completed = true;
          }
          return (
            <Step
              key={`step_${index}`}
              {...stepProps}
              >
              <StepLabel>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {contentForStep()}
      <div className='stepFooter'>
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>

        <Button
          variant='contained'
          color='primary'
          onClick={handleNext}
          disabled={isNextDisabled()}
        >
          {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
