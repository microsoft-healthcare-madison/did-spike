import React from 'react';

import Typography from '@material-ui/core/Typography';
import { Select, MenuItem, FormControl, FormHelperText} from '@material-ui/core';

import HealthcareProvider from '../models/HealthcareProvider';

export interface ConnectToProviderProps {
  selectedProvider:string|undefined;
  setSelectedProvider:((provider:string) => void);
}

export default function ConnectToProvider(props: ConnectToProviderProps) {

  const providers:HealthcareProvider[] = [
    {name: 'SMART R4 Sandbox', fhirEndpointUrl:'http://launch.smarthealthit.org/v/r4/sim/eyJoIjoiMSIsImoiOiIxIn0/fhir/'}
    // {name: 'SMART R4 Sandbox', fhirEndpointUrl:'https://r4.smarthealthit.org'}
  ];

  function handleProviderSelectChange(event: any) {
    // **** update our state variable ****

    props.setSelectedProvider(event.target.value);

    // **** update local storage ****

    localStorage.setItem('providerUrl', event.target.value);
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
