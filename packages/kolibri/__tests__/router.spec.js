import { NavigationFailureType } from 'vue-router';
import router from '../router';

const guardError = new Error('guard error');

const failedNavigations = [
  ['duplicated', { name: 'HOME' }],
  ['redirected', { name: 'REDIRECTING' }],
  ['aborted', { name: 'ABORTING' }],
];

describe('router', () => {
  const nodeEnv = process.env.NODE_ENV;
  let vueRouter;

  beforeAll(async () => {
    vueRouter = router.initRoutes([
      { name: 'HOME', path: '/' },
      {
        name: 'REDIRECTING',
        path: '/redirecting',
        handler: (to, from, next) => next({ name: 'HOME' }),
      },
      {
        name: 'ABORTING',
        path: '/aborting',
        handler: (to, from, next) => next(false),
      },
      {
        name: 'THROWING',
        path: '/throwing',
        handler: () => {
          throw guardError;
        },
      },
    ]);
    vueRouter.onError(() => {});
    await vueRouter.push({ name: 'HOME' });
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  describe.each(['push', 'replace'])('%s', method => {
    it('hands a failure to onAbort when given callbacks', () => {
      const onAbort = jest.fn();
      vueRouter[method]({ name: 'ABORTING' }, () => {}, onAbort);
      expect(onAbort).toHaveBeenCalledWith(
        expect.objectContaining({ type: NavigationFailureType.aborted }),
      );
    });

    describe.each(['production', 'development'])('in a %s build', env => {
      beforeEach(() => {
        process.env.NODE_ENV = env;
      });

      it('rejects with the error a guard throws', async () => {
        await expect(vueRouter[method]({ name: 'THROWING' })).rejects.toBe(guardError);
      });
    });

    describe('in a production build', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it.each(failedNavigations)('resolves with a %s failure', async (type, location) => {
        await expect(vueRouter[method](location)).resolves.toHaveProperty(
          'type',
          NavigationFailureType[type],
        );
      });
    });

    describe('in a development build', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it.each(failedNavigations)('rejects with a %s failure', async (type, location) => {
        await expect(vueRouter[method](location)).rejects.toHaveProperty(
          'type',
          NavigationFailureType[type],
        );
      });
    });
  });
});
