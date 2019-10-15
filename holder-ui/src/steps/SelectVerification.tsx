import React, { useState, useRef, useEffect } from 'react';

import Typography from '@material-ui/core/Typography';
import { Button, IconButton, Select, MenuItem, FormControl, FormHelperText, } from '@material-ui/core';

import FHIR from 'fhirclient';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { Patient, ContactPoint } from '../util/fhir_selected';

export interface SelectVerificationProps {
  fhirClient:any;
  setVerifyPhone: ((phone: string) => void);
  setVerifyMethod: ((method: string) => void);
}

export default function SelectVerification(props: SelectVerificationProps) {

  const initialLoadRef = useRef<boolean>(true);

  const [patient, setPatient] = useState<string>();
  const [contactPoints, setContactPoints] = useState<ContactPoint[]>([]);
  const [selectedContactPointIndex, setSelectedContactPointIndex] = useState<number>(-1);
  const [selectedVerifyMethod, setSelectedVerifyMethod] = useState<string>('sms');

  useEffect(() => {
    if (initialLoadRef.current) {
      // **** request a patient ****

      props.fhirClient.request(`Patient/${props.fhirClient.patient.id}`)
        .then((result: any) => {

          // **** set the patient for display ****

          setPatient(JSON.stringify(result, null, 2));

          let patient:Patient = result as Patient;

          if ((patient.id) && 
              (patient.name) &&
              (patient.telecom)) {
            // **** update our contact points ****

            setContactPoints(patient.telecom!);

            if (patient.telecom!.length > 0) {
              setSelectedContactPointIndex(0);
              props.setVerifyPhone(patient.telecom![0].value!);
            }
          }
        })
        ;

      // **** no longer first load ****

      initialLoadRef.current = false;
    }
  }, []);

  
  function handleContactPointSelectChange(event: any) {

    let index:number = parseInt(event.target.value);

    // **** update our state variable ****

    setSelectedContactPointIndex(index);

    // **** tell our parent the phone number ****

    props.setVerifyPhone(contactPoints[index].value!);
  }

  function handleVerifyMethodChange(event: any) {
    setSelectedVerifyMethod(event.target.value);
    props.setVerifyMethod(event.target.value);
  }

  return(
    <div className='StepContent'>
      
      <Typography variant='h6'>
        Select Verification Info
      </Typography>

      { patient &&
        <SyntaxHighlighter
          language='json'
          style={atomOneDark}
          >
          {patient}
        </SyntaxHighlighter>
      }

      <br />
      
      <FormControl>
        <Select
          value={selectedContactPointIndex}
          onChange={handleContactPointSelectChange}
          >
          {contactPoints.map((contactPoint, index) => {
            if (contactPoint.system !== 'phone') return(null);
            if (!contactPoint.value) return(null);
            return (
              <MenuItem
                key={`contact_${index}`}
                value={index}
                >
                {contactPoint.use} {contactPoint.system} {contactPoint.value}
              </MenuItem>
            );
          })}
        </Select>
        <FormHelperText>Select a phone number to verify</FormHelperText>
      </FormControl>
      <br/>
      <FormControl>
        <Select
          value='sms'
          onChange={handleVerifyMethodChange}
          >
          <MenuItem key='method_sms' value='sms'>SMS</MenuItem>
          <MenuItem key='method_voice' value='voice'>Voice</MenuItem>
        </Select>
        <FormHelperText>Select a verification method</FormHelperText>
      </FormControl>


    </div>
  );
}
