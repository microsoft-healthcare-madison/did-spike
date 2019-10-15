import React, { useState, useRef, useEffect } from 'react';

import Typography from '@material-ui/core/Typography';
import { Select, MenuItem, FormControl, FormHelperText} from '@material-ui/core';

import HealthcareProvider from '../models/HealthcareProvider';

import FHIR from 'fhirclient';

export interface ConnectToProviderProps {
  selectedProvider:string|undefined;
  setSelectedProvider:((provider:string) => void);
}

export default function ConnectToProvider(props: ConnectToProviderProps) {

  const initialLoadRef = useRef<boolean>(true);

  const providers:HealthcareProvider[] = [
    {name: 'SMART R4 Sandbox', fhirEndpointUrl:'http://launch.smarthealthit.org/v/r4/sim/eyJoIjoiMSIsImoiOiIxIn0/fhir'}
    // {name: 'SMART R4 Sandbox', fhirEndpointUrl:'https://r4.smarthealthit.org'}
  ];

  useEffect(() => {
    if (initialLoadRef.current) {
      // **** check for stored item ****

      if (localStorage.getItem('providerUrl')) {
        props.setSelectedProvider(localStorage.getItem('providerUrl')!);
      }

      // **** no longer first load ****

      initialLoadRef.current = false;
    }
  }, []);

  function handleProviderSelectChange(event: any) {
    // **** update our state variable ****

    props.setSelectedProvider(event.target.value);

    // **** update local storage ****

    localStorage.setItem('providerUrl', event.target.value);
  }
  
  function smartLaunch() {

    console.log('selected provider', props.selectedProvider);

    FHIR.oauth2.authorize({
      'client_id': 'did_spike_holder',
      'scope': 'patient/Patient.read, launch/patient',
      'iss': props.selectedProvider,
    });
  }


  return(
    <div className='StepContent'>
      
      <Typography variant='h6'>
        Connect to a Healthcare Provider
      </Typography>

      <FormControl
        >
        <Select
          key='provider-select'
          value={props.selectedProvider}
          onChange={handleProviderSelectChange}
          // inputProps={{name:'name', id:'fhirEndpointUrl'}}

          >
          {providers.map((provider, index) => {
            return (
              <MenuItem
                key={`provider_${index}`}
                value={provider.fhirEndpointUrl}
                >
                {provider.name}
              </MenuItem>
            );
          })}
        </Select>
        <FormHelperText>Select a Healthcare Provider</FormHelperText>
      </FormControl>

    </div>
  );
}
