import heartbeat from 'kolibri/heartbeat';
import { error, handleError, handleApiError, clearError } from '../appError';

jest.mock('kolibri/heartbeat', () => ({
  setReloadOnReconnect: jest.fn(),
}));

jest.mock('kolibri-logging', () => ({
  getLogger: () => ({
    debug: jest.fn(),
  }),
}));

jest.mock('kolibri/utils/sanitizeError', () => jest.fn(err => err));

describe('appError', () => {
  beforeEach(() => {
    clearError();
  });

  describe('handleError', () => {
    it('sets the error ref to the provided string', () => {
      handleError('catastrophic failure');
      expect(error.value).toBe('catastrophic failure');
    });
  });

  describe('clearError', () => {
    it('sets the error ref to null', () => {
      handleError('some error');
      clearError();
      expect(error.value).toBeNull();
    });
  });

  describe('handleApiError', () => {
    it('sets error state for plain object errors', () => {
      const apiError = { message: 'Too Bad' };
      expect(() => handleApiError({ error: apiError })).toThrow();
      expect(error.value).toMatch(/Too Bad/);
    });

    it('re-throws the original error', () => {
      const apiError = { message: 'Too Bad' };
      expect(() => handleApiError({ error: apiError })).toThrow(apiError);
    });

    it('handles Error instances with response property', () => {
      const apiError = new Error('Network fail');
      apiError.response = { status: 500, data: 'Server error' };
      expect(() => handleApiError({ error: apiError })).toThrow(apiError);
      expect(error.value).toBeTruthy();
    });

    it('handles plain Error instances without response', () => {
      const apiError = new Error('Something broke');
      expect(() => handleApiError({ error: apiError })).toThrow(apiError);
      expect(error.value).toBe('Error: Something broke');
    });

    it('does not set error for disconnection error codes', () => {
      const apiError = new Error('Disconnected');
      apiError.response = { status: 0 };
      // DisconnectionErrorCodes includes 0
      handleApiError({ error: apiError, reloadOnReconnect: true });
      expect(error.value).toBeNull();
      expect(heartbeat.setReloadOnReconnect).toHaveBeenCalledWith(true);
    });

    it('does not throw when shouldThrow is false', () => {
      const apiError = { message: 'Too Bad' };
      expect(() => handleApiError({ error: apiError, shouldThrow: false })).not.toThrow();
      expect(error.value).toMatch(/Too Bad/);
    });

    it('does not set error for disconnection codes when shouldThrow is false', () => {
      const apiError = new Error('Disconnected');
      apiError.response = { status: 0 };
      handleApiError({ error: apiError, reloadOnReconnect: true, shouldThrow: false });
      expect(error.value).toBeNull();
      expect(heartbeat.setReloadOnReconnect).toHaveBeenCalledWith(true);
    });
  });
});
