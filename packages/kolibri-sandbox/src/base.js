export const events = {
  READYCHECK: 'readycheck',
  MAINREADY: 'mainready',
  IFRAMEREADY: 'iframeready',
  STATEUPDATE: 'stateupdate',
  SHIMSTATEUPDATE: 'shimstateupdate',
  USERDATAUPDATE: 'userdataupdate',
  RETARGET: 'retarget',
  LOADING: 'loading',
  ERROR: 'error',
  NOW_SHOWING: 'nowshowing',
  RENDER_FILE: 'renderfile',
  FILE_OVERLAY: 'fileoverlay',
  CLOSE_FILE: 'closefile',
  HANDLER_REQUESTED: 'handlerrequested',
  HANDLER_REGISTRATION: 'handlerregistration',
};

export const nameSpace = 'sandbox';

export function requestError(message, status) {
  return Object.assign(new Error(message), { status });
}
