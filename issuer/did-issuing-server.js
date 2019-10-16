const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const port = 3000;

import { createIdentity } from 'nacl-did';

// TODO: load this from a local file, if requested
const identity = createIdentity();

// TODO: determine if app.all can be used to insert response headers without
//       requiring any changes at the other handlers.
function decorate(res) {
  return res.set('did', identity.did);
}

const debug = (req, res) => {
  decorate(res).send('<pre>' + JSON.stringify(identity, null, 2) + '</pre>');
}

const did = (req, res) => {
  decorate(res).send(identity.did);
}

// establish an SMS claim
const verify = (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));
  // TODO: what are the required components in the request?
  decorate(res).send('SMS<p><pre>' + JSON.stringify(identity, null, 2) + '</pre>');
}

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(function (req, res, next) {
  decorate(res).status(404).send("Sorry can't find that!")
});

app.get('/', (req, res) => res.json(identity));
app.get('/did', did);
app.get('/debug', debug);
app.post('/verify', verify);

app.listen(port, () => console.log(`http://localhost:${port}`));
