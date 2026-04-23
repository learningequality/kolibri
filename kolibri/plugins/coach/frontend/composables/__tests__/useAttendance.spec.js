import AttendanceSessionResource from 'kolibri-common/apiResources/AttendanceSessionResource';
import { useAttendance } from '../useAttendance';

jest.mock('kolibri-common/apiResources/AttendanceSessionResource');
jest.mock('kolibri-common/strings/attendanceStrings', () => ({
  attendanceStrings: {
    $formatDate: jest.fn(date => {
      return `formatted-date:${date.toISOString()}`;
    }),
    $formatTime: jest.fn(date => {
      return `formatted-time:${date.toISOString()}`;
    }),
  },
}));

describe('useAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { sessions, currentSession, recentSessions, attendanceLoading } = useAttendance();
    sessions.value = [];
    currentSession.value = null;
    recentSessions.value = [];
    attendanceLoading.value = false;
  });

  describe('fetchSessions', () => {
    it('should call AttendanceSessionResource.fetchCollection with classId and params', async () => {
      const mockSessions = [{ id: '1' }, { id: '2' }];
      AttendanceSessionResource.fetchCollection.mockResolvedValue({
        results: mockSessions,
        total_pages: 1,
        count: 2,
      });

      const { fetchSessions, sessions, attendanceLoading, totalPages, sessionCount } =
        useAttendance();

      const promise = fetchSessions('class-1', { start_date: '2025-01-01' });
      expect(attendanceLoading.value).toBe(true);

      await promise;

      expect(AttendanceSessionResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { collection: 'class-1', start_date: '2025-01-01' },
        force: true,
      });
      expect(sessions.value).toEqual(mockSessions);
      expect(totalPages.value).toBe(1);
      expect(sessionCount.value).toBe(2);
      expect(attendanceLoading.value).toBe(false);
    });

    it('should let errors propagate and reset loading', async () => {
      const error = new Error('Network error');
      AttendanceSessionResource.fetchCollection.mockRejectedValue(error);

      const { fetchSessions, attendanceLoading } = useAttendance();

      await expect(fetchSessions('class-1')).rejects.toThrow('Network error');
      expect(attendanceLoading.value).toBe(false);
    });
  });

  describe('fetchSession', () => {
    it('should call AttendanceSessionResource.fetchModel with sessionId', async () => {
      const mockSession = { id: 'session-1', collection: 'class-1' };
      AttendanceSessionResource.fetchModel.mockResolvedValue(mockSession);

      const { fetchSession, currentSession } = useAttendance();
      await fetchSession('session-1');

      expect(AttendanceSessionResource.fetchModel).toHaveBeenCalledWith({
        id: 'session-1',
        force: true,
      });
      expect(currentSession.value).toEqual(mockSession);
    });

    it('should let errors propagate', async () => {
      AttendanceSessionResource.fetchModel.mockRejectedValue(new Error('Not found'));

      const { fetchSession } = useAttendance();
      await expect(fetchSession('bad-id')).rejects.toThrow('Not found');
    });
  });

  describe('fetchRecentSessions', () => {
    it('should call AttendanceSessionResource.fetchRecentSessions with classId and limit', async () => {
      const mockRecent = [{ id: '1', present_count: 10, total_count: 15 }];
      AttendanceSessionResource.fetchRecentSessions.mockResolvedValue(mockRecent);

      const { fetchRecentSessions, recentSessions } = useAttendance();
      await fetchRecentSessions('class-1', 3);

      expect(AttendanceSessionResource.fetchRecentSessions).toHaveBeenCalledWith({
        collection: 'class-1',
        limit: 3,
      });
      expect(recentSessions.value).toEqual(mockRecent);
    });

    it('should default limit to 5', async () => {
      AttendanceSessionResource.fetchRecentSessions.mockResolvedValue([]);

      const { fetchRecentSessions } = useAttendance();
      await fetchRecentSessions('class-1');

      expect(AttendanceSessionResource.fetchRecentSessions).toHaveBeenCalledWith({
        collection: 'class-1',
        limit: 5,
      });
    });

    it('should let errors propagate', async () => {
      AttendanceSessionResource.fetchRecentSessions.mockRejectedValue(new Error('Server error'));

      const { fetchRecentSessions } = useAttendance();
      await expect(fetchRecentSessions('class-1')).rejects.toThrow('Server error');
    });
  });

  describe('createSession', () => {
    it('should call AttendanceSessionResource.saveModel with data', async () => {
      const newSession = { id: 'new-1', collection: 'class-1' };
      AttendanceSessionResource.saveModel.mockResolvedValue(newSession);

      const { createSession } = useAttendance();
      const result = await createSession({ collection: 'class-1' });

      expect(AttendanceSessionResource.saveModel).toHaveBeenCalledWith({
        data: { collection: 'class-1' },
      });
      expect(result).toEqual(newSession);
    });

    it('should let errors propagate', async () => {
      AttendanceSessionResource.saveModel.mockRejectedValue(new Error('Validation error'));

      const { createSession } = useAttendance();
      await expect(createSession({})).rejects.toThrow('Validation error');
    });
  });

  describe('updateSession', () => {
    it('should call AttendanceSessionResource.saveModel with id and data', async () => {
      const updated = { id: 'session-1', collection: 'class-1' };
      AttendanceSessionResource.saveModel.mockResolvedValue(updated);

      const { updateSession } = useAttendance();
      const result = await updateSession('session-1', { collection: 'class-2' });

      expect(AttendanceSessionResource.saveModel).toHaveBeenCalledWith({
        id: 'session-1',
        data: { collection: 'class-2' },
      });
      expect(result).toEqual(updated);
    });

    it('should let errors propagate', async () => {
      AttendanceSessionResource.saveModel.mockRejectedValue(new Error('Forbidden'));

      const { updateSession } = useAttendance();
      await expect(updateSession('id', {})).rejects.toThrow('Forbidden');
    });
  });

  describe('formatAttendanceDateTime', () => {
    it('should return formatted date and time strings', () => {
      const { formatAttendanceDateTime } = useAttendance();
      const testDate = new Date('2025-03-15T14:30:00Z');
      const result = formatAttendanceDateTime(testDate);

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(result.date).toContain('formatted-date:');
      expect(result.time).toContain('formatted-time:');
    });

    it('should handle string dates by converting to Date objects', () => {
      const { formatAttendanceDateTime } = useAttendance();
      const result = formatAttendanceDateTime('2025-03-15T14:30:00Z');

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
    });
  });
});
