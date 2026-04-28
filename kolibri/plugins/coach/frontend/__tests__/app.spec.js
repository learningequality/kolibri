import { PageNames, pagesWithLocalDataLoading } from '../constants';

describe('pagesWithLocalDataLoading', () => {
  // Regression test for https://github.com/learningequality/kolibri/issues/14554
  // Attendance pages must be in this list so the beforeEach guard calls next()
  // immediately instead of waiting for initClassInfo to resolve.
  it('includes all attendance pages', () => {
    expect(pagesWithLocalDataLoading).toContain(PageNames.ATTENDANCE_HISTORY);
    expect(pagesWithLocalDataLoading).toContain(PageNames.ATTENDANCE_EDIT);
    expect(pagesWithLocalDataLoading).toContain(PageNames.ATTENDANCE_NEW);
  });
});
