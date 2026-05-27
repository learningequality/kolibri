import useUser from 'kolibri/composables/useUser';
import { UserKinds } from 'kolibri/constants';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/utils/serverClock', () => ({ setServerTime: jest.fn() }));

describe('useUser', () => {
  let setSession;

  beforeEach(() => {
    ({ setSession } = useUser());
    setSession({ session: { kind: [UserKinds.ANONYMOUS] } });
  });

  describe('hasRole', () => {
    it.each([
      [true, [UserKinds.COACH]],
      [true, [UserKinds.ASSIGNABLE_COACH]],
      [true, [UserKinds.ADMIN]],
      [true, [UserKinds.SUPERUSER]],
      [false, [UserKinds.LEARNER]],
      [false, [UserKinds.ANONYMOUS]],
    ])('is %p for kind %p', (expected, kind) => {
      setSession({ session: { kind } });
      const { hasRole } = useUser();
      expect(hasRole.value).toBe(expected);
    });

    it('is true when ADMIN and COACH kinds are both present', () => {
      setSession({ session: { kind: [UserKinds.ADMIN, UserKinds.COACH] } });
      const { hasRole } = useUser();
      expect(hasRole.value).toBe(true);
    });
  });

  describe('three-state partition: anonymous / plain learner / role-holder', () => {
    it('anonymous: isUserLoggedIn=false, isLearner=false, hasRole=false', () => {
      const { isUserLoggedIn, isLearner, hasRole } = useUser();
      expect(isUserLoggedIn.value).toBe(false);
      expect(isLearner.value).toBe(false);
      expect(hasRole.value).toBe(false);
    });

    it('plain learner: isUserLoggedIn=true, isLearner=true, hasRole=false', () => {
      setSession({ session: { kind: [UserKinds.LEARNER] } });
      const { isUserLoggedIn, isLearner, hasRole } = useUser();
      expect(isUserLoggedIn.value).toBe(true);
      expect(isLearner.value).toBe(true);
      expect(hasRole.value).toBe(false);
    });

    it.each([
      [UserKinds.COACH],
      [UserKinds.ASSIGNABLE_COACH],
      [UserKinds.ADMIN],
      [UserKinds.SUPERUSER],
    ])('role-holder (%p): isUserLoggedIn=true, isLearner=false, hasRole=true', kind => {
      setSession({ session: { kind: [kind] } });
      const { isUserLoggedIn, isLearner, hasRole } = useUser();
      expect(isUserLoggedIn.value).toBe(true);
      expect(isLearner.value).toBe(false);
      expect(hasRole.value).toBe(true);
    });
  });
});
