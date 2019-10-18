import React, {useEffect, useState } from 'react';

import Typography from '@material-ui/core/Typography';
import { CircularProgress, } from '@material-ui/core';

export interface WaitOnConfirmationProps {
  checkVerificationState: (() => Promise<boolean>);
}

export default function WaitOnConfirmation(props: WaitOnConfirmationProps) {
  const [checkRequired, setCheckRequired] = useState<boolean>(true);

  useEffect(() => {

    async function checkServer() {
      
      if (await props.checkVerificationState()) {
        // **** done ****

        return;
      }

      // **** we need to try again shortly ****

      setTimeout(() => {setCheckRequired(true)}, 1000);
    }

    if (checkRequired) {
      // **** start a check ****

      checkServer();
      
      // **** do not start another check ****

      setCheckRequired(false);
    }
  }, [checkRequired]);


  return(
    <div className="StepContent">
      
      <Typography variant='h6' className='inline' >
        Waiting on confirmation . . .
      </Typography>

      <br /><br />

      <CircularProgress />

    </div>
  );
}
