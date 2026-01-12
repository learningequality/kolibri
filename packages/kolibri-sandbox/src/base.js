export const events = {
  READYCHECK: 'readycheck',
  MAINREADY: 'mainready',
  IFRAMEREADY: 'iframeready',
  STATEUPDATE: 'stateupdate',
  SHIMSTATEUPDATE: 'shimstateupdate',
  USERDATAUPDATE: 'userdataupdate',
  // The request/reply vocabulary of the window.kolibri custom-channel API. Its iframe
  // end is html5_viewer's KolibriShim, but its main end is learn's
  // CustomContentRenderer, and this package is the only one both can import - handler
  // bundles build without Kolibri externals - so it stays here rather than in either.
  COLLECTIONREQUESTED: 'collectionrequested',
  COLLECTIONPAGEREQUESTED: 'collectionpagerequested',
  MODELREQUESTED: 'modelrequested',
  SEARCHRESULTREQUESTED: 'searchresultrequested',
  DATARETURNED: 'datareturned',
  NAVIGATETO: 'navigateTo',
  CONTEXT: 'context',
  THEMECHANGED: 'themechanged',
  KOLIBRIVERSIONREQUESTED: 'kolibriversionrequested',
  CHANNELMETADATAREQUESTED: 'channelmetadatarequested',
  CHANNELFILTEROPTIONSREQUESTED: 'channelfilteroptionsrequested',
  RANDOMCOLLECTIONREQUESTED: 'randomcollectionrequested',
  LOADING: 'loading',
  ERROR: 'error',
  HANDLER_REGISTRATION: 'handlerregistration',
};

export const MessageStatuses = {
  FAILURE: 'failure',
  SUCCESS: 'success',
};

export const nameSpace = 'sandbox';
