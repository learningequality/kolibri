/**
 * @see kolibri/core/discovery/models.py:ConnectionStatus
 */
export const ConnectionStatus = {
  Unknown: 'Unknown',
  ConnectionFailure: 'ConnectionFailure',
  ResponseTimeout: 'ResponseTimeout',
  ResponseFailure: 'ResponseFailure',
  InvalidResponse: 'InvalidResponse',
  Conflict: 'Conflict',
};

export const UnreachableConnectionStatuses = [
  ConnectionStatus.ConnectionFailure,
  ConnectionStatus.ResponseTimeout,
];
