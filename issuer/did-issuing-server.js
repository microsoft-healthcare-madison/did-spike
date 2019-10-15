const express = require('express')
const app = express()
const port = 3000

import { createIdentity } from 'nacl-did'

const identity = createIdentity();

app.get('/', (req, res) => res.json(identity));

app.listen(port, () => console.log(`http://localhost:${port}`));
