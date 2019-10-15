import React from 'react';

import { createIdentity, NaCLIdentity } from 'nacl-did'

import Typography from '@material-ui/core/Typography';
import { Button, IconButton, } from '@material-ui/core';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

import { CopyHelper } from '../util/CopyHelper';

import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';

export interface GenerateDidProps {
  identity: NaCLIdentity | undefined;
  setIdentity: ((identity: NaCLIdentity) => void);
}

export default function GenerateDid(props: GenerateDidProps) {

  function replaceIdentity() {
    // **** create an identity ****

    const genId:NaCLIdentity = createIdentity();

    // **** set for local use ****

    props.setIdentity(genId);

    // **** save for later use ****

    localStorage.setItem('did', JSON.stringify(genId));
  }

  function copyDidToClipboard() {
    CopyHelper.copyToClipboard(JSON.stringify(props.identity, null, 2));
  }

  return(
    <div className="StepContent">
      
      <Typography variant='h6' className='inline' >
        Current Local Identity&nbsp;
      </Typography>
      {/* <b>Current Local Identity</b><br/> */}

      <IconButton
        aria-label='copy'
        size='small'
        onClick={copyDidToClipboard}
        >
        <FileCopyOutlinedIcon />
      </IconButton>

      <SyntaxHighlighter
        language='json'
        style={atomOneDark}
        >
        {props.identity ? JSON.stringify(props.identity, null, 2) : ''}
      </SyntaxHighlighter>

      <Button
        variant='contained'
        onClick={replaceIdentity}
        >
        Generate New Identity
      </Button>
    </div>
  );
}
