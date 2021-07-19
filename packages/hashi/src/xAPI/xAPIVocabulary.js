// Known XAPI verbs, based on the ADL XAPI vocabulary:
// https://github.com/adlnet/xapi-authored-profiles/blob/master/adl/v1.0/adl.jsonld

export const XAPIVerbMap = {
  attended: 'http://adlnet.gov/expapi/verbs/attended',
  imported: 'http://adlnet.gov/expapi/verbs/imported',
  interacted: 'http://adlnet.gov/expapi/verbs/interacted',
  attempted: 'http://adlnet.gov/expapi/verbs/attempted',
  registered: 'http://adlnet.gov/expapi/verbs/registered',
  progressed: 'http://adlnet.gov/expapi/verbs/progressed',
  preferred: 'http://adlnet.gov/expapi/verbs/preferred',
  commented: 'http://adlnet.gov/expapi/verbs/commented',
  answered: 'http://adlnet.gov/expapi/verbs/answered',
  asked: 'http://adlnet.gov/expapi/verbs/asked',
  launched: 'http://adlnet.gov/expapi/verbs/launched',
  'logged-in': 'https://w3id.org/xapi/adl/verbs/logged-in',
  shared: 'http://adlnet.gov/expapi/verbs/shared',
  'logged-out': 'https://w3id.org/xapi/adl/verbs/logged-out',
  voided: 'http://adlnet.gov/expapi/verbs/voided',
  exited: 'http://adlnet.gov/expapi/verbs/exited',
  experienced: 'http://adlnet.gov/expapi/verbs/experienced',
  mastered: 'http://adlnet.gov/expapi/verbs/mastered',
  // These are not specified in the above link, but are claimed by H5P to be derived
  // from the ADL XAPI Vocabulary
  // At least some seem to be derived from the CMI5 specification that defines specific verbs
  // https://github.com/AICC/CMI-5_Spec_Current/blob/quartz/cmi5_spec.md#93-verbs
  completed: 'http://adlnet.gov/expapi/verbs/completed',
  failed: 'http://adlnet.gov/expapi/verbs/failed',
  initialized: 'http://adlnet.gov/expapi/verbs/initialized',
  passed: 'http://adlnet.gov/expapi/verbs/passed',
  responded: 'http://adlnet.gov/expapi/verbs/responded',
  resumed: 'http://adlnet.gov/expapi/verbs/resumed',
  scored: 'http://adlnet.gov/expapi/verbs/scored',
  suspended: 'http://adlnet.gov/expapi/verbs/suspended',
  terminated: 'http://adlnet.gov/expapi/verbs/terminated',

  // These are custom verbs added by H5P and are not included in the above vocabulary
  // used by the H5P action bar - we deviate here by using an invented URI
  // These should not actually get used in our implementation, as we hide all these UI
  // elements.
  downloaded: 'http://h5p.org/x-api/verbs/downloaded',
  copied: 'http://h5p.org/x-api/verbs/copied',
  'accessed-reuse': 'http://h5p.org/x-api/verbs/accessed-reuse',
  'accessed-embed': 'http://h5p.org/x-api/verbs/accessed-embed',
  'accessed-copyright': 'http://h5p.org/x-api/verbs/accessed-copyright',
};
