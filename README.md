# did spike

Quick exploration of decentralized identity tools / technology for conveying identity in healthcare. Goals include:

* Understand technical + UX flow for did-based credentialing protocols
* Generate verifiable credentials based on EHR patient portal access + phone number
* Bring to the surface any issues re: query-based patient access to healthcare data in national networks


# Documentation

- Accept a request to create a Verified Credential
  - The request comes signed by a DID
  - Comes with supporting evidence
    - Access Token
    - FHIR Patient ID
    - Phone Number that matches a number in the Patient resource
  - Verify the signature
  - Verify the supporting evidence (true!)
  - Generate an output credential as a V.C. document

- General
  - Ed25519 for key pairs
  - Look at did-peer method
  - Consider how to provide a janky resolver
    - Something to register a DID and return a document
  - Consider encoding the document as the DID itself did:self:<Base64>
  - Consider using the public key as the DID
    - https://github.com/uport-project/nacl-did
  - Start using JavaScript / TypeScript
    - Two applications/projects/things
    - Need to communicate with each other
    - Need to communicate with a FHIR server
    - Need to communicate with the DID resolver (hopefully just a call)
    - Need to encrypt/sign/verify/etc. (hopefully just lib calls)
    - Need to interact with verification services (hopefully just API call)
    - Should be able to keep everything in memory for now
      - May need to read/write JSON (filesystem or Storage API)
  
- Server creates a DID for itself and registers a DID document
  - Server generates key pair
  - Includes public key as auth key in DID document
  - Tell the Client (register with Resolver) that the Server has this document
  
- Client creates a DID for the user and registers a DID document
  - Client generates key pair
  - Includes public key as auth key in DID document
  - Tell the Server (register with Resolver) that the Client has this document
- Client engages in a SMART workflow with the user and a FHIR server
  - Authenticates
  - Passes token to the Server
- Server uses the token retrieve Patient resource
- Server should ask the patient for which contact point to verify (phone/email)
  - For now, we can push to the client
- Server needs to perform verification process
  - Twilio / Bandwidth.com / Nexmo / Plivo / ClickSend
- If failed
  - Server does NOT add the credential
  - Abort / fail
- If Passed
  - Server creates credential
    - Claim 1:
      - FHIR Server
      - Patient Resource
    - Claim 2:
      - Phone number / email / whatever we verified
  - Server provides the credential to the Client
- Client monitors server to check for the credential
- Client stores the credential for later use

## More Information


## Contributing
This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

There are many other ways to contribute:
* [Submit bugs](https://github.com/microsoft-healthcare-madison/did-spike/issues) and help us verify fixes as they are checked in.
* Review the [source code changes](https://github.com/microsoft-healthcare-madison/did-spike/pulls).
* Engage with users and developers on [Official FHIR Zulip](https://chat.fhir.org/)
* [Contribute bug fixes](CONTRIBUTING.md).

See [Contributing](CONTRIBUTING.md) for more information.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

FHIR&reg; is the registered trademark of HL7 and is used with the permission of HL7. 
