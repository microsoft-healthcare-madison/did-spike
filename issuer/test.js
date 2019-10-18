import i from './did-issuing-server.js'
import {createVerification} from './lib'
import store from './store'

const v = createVerification({
  fhirBaseUrl: "https://r4.smarthealthit.org",
  resourceType: "Patient",
  resourceId: "835a3b08-e3b6-49c4-a23f-1fac8dc7a7a7",
  contactPoint: { system: 'phone', value: '555-258-5879', use: 'home' },
  verifyMethod: 'sms'
})

store.dispatch('verifications/add', v)