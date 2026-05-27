import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { UserKinds } from 'kolibri/constants';
import useUserKind from '../useUserKind';

jest.mock('kolibri/composables/useUser');

describe('useUserKind', () => {
  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock({ isLearner: false }));
  });

  it('returns SUPERUSER when isSuperuser is true (priority over isAdmin)', () => {
    useUser.mockImplementation(() =>
      useUserMock({ isSuperuser: true, isAdmin: true, isLearner: false }),
    );
    const { userKind } = useUserKind();
    expect(userKind.value).toBe(UserKinds.SUPERUSER);
  });

  it('returns ADMIN when isAdmin but not isSuperuser', () => {
    useUser.mockImplementation(() =>
      useUserMock({ isAdmin: true, isSuperuser: false, isLearner: false }),
    );
    const { userKind } = useUserKind();
    expect(userKind.value).toBe(UserKinds.ADMIN);
  });

  it('returns COACH when isCoach (not admin or superuser)', () => {
    useUser.mockImplementation(() => useUserMock({ isCoach: true, isLearner: false }));
    const { userKind } = useUserKind();
    expect(userKind.value).toBe(UserKinds.COACH);
  });

  it('returns LEARNER when isLearner (no elevated role)', () => {
    useUser.mockImplementation(() => useUserMock({ isLearner: true }));
    const { userKind } = useUserKind();
    expect(userKind.value).toBe(UserKinds.LEARNER);
  });

  it('returns ANONYMOUS when no role and not learner', () => {
    useUser.mockImplementation(() => useUserMock({ isLearner: false }));
    const { userKind } = useUserKind();
    expect(userKind.value).toBe(UserKinds.ANONYMOUS);
  });

  it('prioritizes ADMIN over COACH when both are set', () => {
    useUser.mockImplementation(() =>
      useUserMock({ isAdmin: true, isCoach: true, isLearner: false }),
    );
    const { userKind } = useUserKind();
    expect(userKind.value).toBe(UserKinds.ADMIN);
  });
});
