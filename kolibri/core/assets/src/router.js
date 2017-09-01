import VueRouter from 'vue-router';

import Vue from 'vue';

Vue.use(VueRouter);

/** Wrapper around Vue Router.
 *  Implements URL mapping to functions rather than Vue components.
 */
class Router {
  /**
   * Create a Router instance.
   */
  constructor() {
    this._vueRouter = undefined;
    this._actions = {};
  }

  _hook(toRoute, fromRoute, next) {
    if (this._actions[toRoute.name]) {
      this._actions[toRoute.name](toRoute, fromRoute);
    }
    if (next) {
      next();
    }
  }

  init(routes) {
    routes.forEach(route => {
      if (route.handler) {
        // route.component = {};
        this._actions[route.name] = route.handler;
        delete route.handler;
      }
    });
    this._vueRouter = new VueRouter({ routes });
    this._vueRouter.beforeEach(this._hook.bind(this));
    return this.getInstance();
  }

  getInstance(options) {
    return this._vueRouter;
  }
}

const router = new Router();

export { router as default };
