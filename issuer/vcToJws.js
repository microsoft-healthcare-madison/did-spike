import { createIdentity } from 'nacl-did';

var fs = require('fs');

function convertVcToJws(vc) {
  // **** start with basic fields ****

  let jws = {
    iss: vc.issuer,
    jti: vc.id,
    sub: vc.credentialSubject.id,
    vc: vc,
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

// **** sign the JWS, just create an identity for testing ****

let signed = signJws(jws, createIdentity());

console.log('Created JWT:');
console.log(signed);
