import React, { useEffect, useState, useRef } from 'react';

import './App.css';

import { createIdentity, NaCLIdentity } from 'nacl-did'

import { Stepper, StepLabel, Step, Button } from '@material-ui/core';

import FHIR from 'fhirclient';

import GenerateDid from './steps/GenerateDID';
import ConnectToProvider from './steps/ConnectToProvider';
import SelectVerification from './steps/SelectVerification';
import VerificationRequest from './models/VerificationRequest';
import { ContactPoint } from './util/fhir_selected';
import EnterCode from './steps/EnterCode';
import ShowCredential from './steps/ShowCredential';

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
    'Done'                    // 4
  ];

  const initialLoadRef = useRef<boolean>(true);
  const fhirClientRef = useRef<any>();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [identity, setIdentity] = useState<NaCLIdentity>();
  const [selectedProvider, setSelectedProvider] = useState<string>();
  const [verifyContactPoint, setVerifyContactPoint] = useState<ContactPoint>();
  const [verifyMethod, setVerifyMethod] = useState<string>('sms');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [credential, setCredential] = useState<string>('');

  useEffect(() => {
    if (initialLoadRef.current) {

      // **** check to see if local storage has a did ****

      if (localStorage.getItem('did')) {
        // **** use the existing identity ****

        setIdentity(JSON.parse(localStorage.getItem('did')!));
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

  function requestVerification() {
    let request:VerificationRequest = {
      fhirBaseUrl: fhirClientRef.current.state.serverUrl,
      authToken: fhirClientRef.current.state.tokenResponse.access_token,
      resourceType: 'Patient',
      resourceId: fhirClientRef.current.patient.id,
      contactPoint: verifyContactPoint!,
      verificationMethod: verifyMethod
    }

    console.log('Verify:', request);

    // **** just move to next step ****

    setActiveStep(activeStep + 1);
  }

  function checkVerificationCode() {

    console.log('User entered code:', verificationCode);

    // **** invent a credential for now ****

    setCredential('This is a really secure and verifiable credential.  Really.');

    // **** just move to next step ****

    setActiveStep(activeStep + 1);
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
            setVerifyContactPoint={setVerifyContactPoint}
            setVerifyMethod={setVerifyMethod}
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
        return (verifyContactPoint === undefined);
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
