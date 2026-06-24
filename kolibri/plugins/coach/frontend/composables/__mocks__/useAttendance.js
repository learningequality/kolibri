/**
 * `useAttendance` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useAttendance file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useAttendanceMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import { useAttendance, useAttendanceMock } from '<useAttendance file path>';
 *
 * jest.mock('<useAttendance file path>')
 *
 * it('test', () => {
 * useAttendance.mockImplementation(
 * () => useAttendanceMock({ recentSessions: ref([...]) })
 * );
 * })
 * ```
 */

import { ref } from 'vue';

function createDefaults() {
  return {
    attendanceLoading: ref(false),
    sessions: ref([]),
    currentSession: ref(null),
    recentSessions: ref([]),
    totalPages: ref(1),
    sessionCount: ref(0),
    fetchRecentSessions: jest.fn(() => Promise.resolve([])),
    fetchSessions: jest.fn(() => Promise.resolve([])),
    fetchSession: jest.fn(() => Promise.resolve(null)),
    createSession: jest.fn(() => Promise.resolve({})),
    updateSession: jest.fn(() => Promise.resolve({})),
    fetchRecords: jest.fn(() => Promise.resolve([])),
    bulkUpdateRecords: jest.fn(() => Promise.resolve({})),
    formatAttendanceDateTime: jest.fn(() => ({
      date: '2026-03-09',
      time: '10:00 AM',
    })),
  };
}

export function useAttendanceMock(overrides = {}) {
  return {
    ...createDefaults(),
    ...overrides,
  };
}

export const useAttendance = jest.fn(() => useAttendanceMock());
