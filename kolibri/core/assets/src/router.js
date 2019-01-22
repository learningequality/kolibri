import VueRouter from 'vue-router';

/** Wrapper around Vue Router.
 *  Implements URL mapping to Vuex actions in addition to Vue components.
 *  Otherwise intended as a mostly transparent replacement to vue-router.
 */
class Router {
  /**
   * Create a Router instance.
   */
  constructor() {
    this._vueRouter = new VueRouter({
      scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
          return savedPosition;
        } else {
          return { x: 0, y: 0 };
        }
      },
    });
    this._actions = {};
  }

  _hook(toRoute, fromRoute, next) {
    if (this._actions[toRoute.name]) {
      this._actions[toRoute.name](toRoute, fromRoute);
    }
    next();
  }

  init(routes) {
    routes.forEach(route => {
      if (route.handler) {
        this._actions[route.name] = route.handler;
        delete route.handler;
      }
    });
    this._vueRouter.addRoutes(routes);
    return this._vueRouter;
  }

  enableHandlers() {
    this._vueRouter.beforeEach(this._hook.bind(this));
  }

  /****************************/
  /* vue-router proxy methods */
  /****************************/

  replace(location, onComplete, onAbort) {
    return this._vueRouter.replace(location, onComplete, onAbort);
  }

  push(location, onComplete, onAbort) {
    return this._vueRouter.push(location, onComplete, onAbort);
  }

  go(location, onComplete, onAbort) {
    return this._vueRouter.go(location, onComplete, onAbort);
  }

  back(location, onComplete, onAbort) {
    return this._vueRouter.back(location, onComplete, onAbort);
  }

  forward(location, onComplete, onAbort) {
    return this._vueRouter.forward(location, onComplete, onAbort);
  }

  afterEach(func) {
    return this._vueRouter.afterEach(func);
  }

  beforeResolve(func) {
    return this._vueRouter.beforeResolve(func);
  }

  beforeEach(func) {
    return this._vueRouter.beforeEach(func);
  }
}

const router = new Router();

export { router as default };
