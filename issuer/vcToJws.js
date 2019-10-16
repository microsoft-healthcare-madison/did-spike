import { createIdentity } from 'nacl-did';

var fs = require('fs');

const deepCopy = a => JSON.parse(JSON.stringify(a))

function convertVcToJws(vc) {
  // **** start with basic fields ****

  let jws = {
    iss: vc.issuer,
    jti: vc.id,
    sub: vc.credentialSubject.id,
    vc: deepCopy(vc),
  };

  // **** convert UTC dates into Unix Timestamps ****

  if ((vc.expirationDate) && (Date.parse(vc.expirationDate.trim()))) {
    jws.exp = Date.parse(vc.expirationDate.trim()) / 1000;
  }

  if ((vc.issuanceDate) && (Date.parse(vc.issuanceDate.trim()))) {
    jws.nbf = Date.parse(vc.issuanceDate.trim()) / 1000;
  }

  // **** strip out fields from the vc ****

  if (jws.vc.credentialSubject.id) {
    delete jws.vc.credentialSubject.id;
  }

  if (jws.vc.issuer) {
    delete jws.vc.issuer;
  }

  if (jws.vc.expirationDate) {
    delete jws.vc.expirationDate;
  }

  if (jws.vc.issuanceDate) {
    delete jws.vc.issuanceDate;
  }

  // **** return our object ****

  return jws;
}

const unixToIso = s => new Date(s * 1000).toISOString()

function convertJwsToVc(jws) {
  return {
    ...deepCopy(jws.vc),
    issuer: jws.iss,
    id: jws.jti,
    credentialSubject: {
      ...deepCopy(jws.vc.credentialSubject),
      id: jws.sub
    },
    expirationDate: unixToIso(jws.exp),
    issuanceDate: unixToIso(jws.nbf),
  }
}


function signJws(jws, identity) {
  jws.iss = identity.did;
  return identity.createJWT(jws);
}

// **** test code ****

let vc = JSON.parse(fs.readFileSync('./data/vc_01.json'));

console.log('VC loaded:');
console.log(JSON.stringify(vc, null, 2));

// **** convert the VC to a JWS *****

let jws = convertVcToJws(vc);

// **** log ****

console.log('Converted to JWS:');
console.log(JSON.stringify(jws, null, 2));

let backToVc = convertJwsToVc(jws);
console.log('Converted back to VC:');
console.log(JSON.stringify(backToVc, null, 2));

console.log(JSON.stringify(jws, null, 2));

// **** sign the JWS, just create an identity for testing ****

let signed = signJws(jws, createIdentity());

console.log('Created JWT:');
console.log(signed);
