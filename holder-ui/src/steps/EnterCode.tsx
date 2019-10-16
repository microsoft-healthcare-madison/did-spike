import React from 'react';

import Typography from '@material-ui/core/Typography';
import { 
  FormControl, 
  FormHelperText, 
  TextField, 
} from '@material-ui/core';

export interface EnterCodeProps {
  verificationCode: string;
  setVerificationCode:((code: string) => void);
}

export default function EnterCode(props: EnterCodeProps) {

  function handleCodeChange(event: any) {
    props.setVerificationCode(event.target.value);
  }

  return(
    <div className='StepContent'>
      <Typography variant='h6'>
        Enter Verification Code
      </Typography>
      
      <FormControl>
        <TextField
          id='verificationCode'
          label='Verification Code'
          value={props.verificationCode}
          onChange={handleCodeChange}
          margin='normal'
          />
        <FormHelperText>Enter the verification code sent to you</FormHelperText>
      </FormControl>
    </div>
  );
}
