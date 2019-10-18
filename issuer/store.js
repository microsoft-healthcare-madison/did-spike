import createStore from "storeon";
import { _verificationStates } from "./constants";

const setStatusForId = status => ({ verifications }, { id }) => ({
  verifications: {
    ...verifications,
    [id]: {
      ...verifications[id],
      status
    }
  }
});

export default createStore([
  store => {
    store.on("@init", () => {
      return { verifications: {} };
    });

    store.on("verifications/add", ({ verifications }, v) => ({
      verifications: {
        ...verifications,
        [v.id]: v
      }
    }));

    store.on(
      "verifications/establish",
      setStatusForId(_verificationStates.ESTABLISHED)
    );
    store.on(
      "verifications/verify-fhir",
      setStatusForId(_verificationStates.FHIR_VERIFIED)
    );
    store.on(
      "verifications/begin-verify-phone",
      setStatusForId(_verificationStates.CONTACT_VERIFYING)
    );
    store.on(
      "verifications/complete-verify-phone",
      setStatusForId(_verificationStates.CONTACT_VERIFIED)
    );

    store.on(
      "verifications/failed",
      ({ verifications }, { id, code, detail }) => ({
        verifications: {
          ...verifications,
          [id]: {
            ...verifications[id],
            status: _verificationStates.ERROR,
            error: code,
            detail
          }
        }
      })
    );
  }
]);
