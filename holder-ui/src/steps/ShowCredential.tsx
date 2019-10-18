import React from 'react';

import Typography from '@material-ui/core/Typography';
import { Button, IconButton, } from '@material-ui/core';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

import { CopyHelper } from '../util/CopyHelper';

import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import SpikeVc from '../models/SpikeVc';

export interface ShowCrendtialProps {
  credential: SpikeVc|undefined;
}

export default function ShowCredential(props: ShowCrendtialProps) {

  let vcJson = JSON.stringify(props.credential, null, 2);

  function copyDidToClipboard() {
    CopyHelper.copyToClipboard(vcJson);
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
        {vcJson ? vcJson : ''}
      </SyntaxHighlighter>

    </div>
  );
}
