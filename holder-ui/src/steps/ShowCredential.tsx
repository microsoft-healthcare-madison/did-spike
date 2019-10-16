import React from 'react';

import Typography from '@material-ui/core/Typography';
import { Button, IconButton, } from '@material-ui/core';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

import { CopyHelper } from '../util/CopyHelper';

import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';

export interface ShowCrendtialProps {
  credential: string;
}

export default function ShowCredential(props: ShowCrendtialProps) {

  function copyDidToClipboard() {
    CopyHelper.copyToClipboard(props.credential);
  }

  return(
    <div className="StepContent">
      
      <Typography variant='h6' className='inline' >
        Verifiable Credential&nbsp;
      </Typography>

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
        {props.credential ? props.credential : ''}
      </SyntaxHighlighter>

    </div>
  );
}
