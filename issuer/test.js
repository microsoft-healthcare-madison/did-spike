import server from './did-issuing-server.js'
import {createVerification} from './lib'
import store from './store'
import fetch, {Headers} from 'node-fetch'

import { createIdentity } from "nacl-did";
const identity = createIdentity();



const initialRequest ={
  fhirBaseUrl: "https://r4.smarthealthit.org",
  resourceType: "Patient",
  resourceId: "835a3b08-e3b6-49c4-a23f-1fac8dc7a7a7",
  contactPoint: { system: 'phone', value: '555-258-5879', use: 'home' },
  verifyMethod: 'sms'
}

const getAndPrintStatus = async (serverDid, vcRequestId) => {
   const statusBody = await identity.encrypt( serverDid, JSON.stringify({
     id: vcRequestId
   }))

   const vcRequestStatus = await fetch('http://localhost:3000/CredentialRequest/status', {
    method: 'POST',
    body: JSON.stringify(statusBody),
    headers: {
      'Content-Type': "application/json"
    }
   }).then(r=>r.json())

   const statusDecrypted = JSON.parse(identity.decrypt(vcRequestStatus))

   console.log("Req status", statusDecrypted)

   return;
}

const runTests = async() => {
  const serverDid = await fetch('http://localhost:3000/did').then(r=>r.text())
  console.log("Got did" ,serverDid)

  const requestBody = await identity.encrypt( serverDid, JSON.stringify(initialRequest))

  console.log("REquestsing", requestBody)


  const vcRequestIdEncrypted = await fetch('http://localhost:3000/CredentialRequest/new', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': "application/json"
    }
   }).then(r=>r.json())

   const vcRequestId = identity.decrypt(vcRequestIdEncrypted)

   getAndPrintStatus(serverDid, vcRequestId)

   await new Promise((resolve, reject) => {
     setTimeout(() => resolve(), 2000)
   })


  console.log("Created req", vcRequestId)


   // submit a verification code
   const verificationCodeSubmission = await identity.encrypt( serverDid, JSON.stringify({
     verificationId: vcRequestId,
     verificationCode: "12345",
   }))

   const verificationCodeResponse = await fetch('http://localhost:3000/confirm', {
    method: 'POST',
    body: JSON.stringify(verificationCodeSubmission),
    headers: {
      'Content-Type': "application/json"
    }
   }).then(r=>r.json())

   console.log("Req status", verificationCodeResponse)

   await new Promise((resolve, reject) => {
     setTimeout(() => resolve(), 2000)
   })


   getAndPrintStatus(serverDid, vcRequestId)
}

//console.log("App", server)

runTests().then(() => {
  console.log("Ran tests")
}).catch(err => {
  console.log("Tests failed", err)
})
/*

const { verificationId, verificationCode } = identity.encrypt(initialRequest);


const v = createVerification()

store.dispatch('verifications/add', v)
*/