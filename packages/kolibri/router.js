import VueRouter from 'vue-router';
import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

/** Wrapper around Vue Router.
 *  Implements URL mapping to Vuex actions in addition to Vue components.
 *  Otherwise intended as a mostly transparent replacement to vue-router.
 */
class Router {
  /**
   * Create a Router instance.
   */
  constructor() {
    this._vueRouter = null;
    this._actions = {};
    this._routes = {};
  }

  _hook(toRoute, fromRoute, next) {
    // We do this so that synchronous code in the handler can call `next`
    // but if the handler is asynchronous, any calls to `next` will be ignored
    let nextCalled = false;
    const nextOnce = (...args) => {
      if (!nextCalled) {
        next(...args);
        nextCalled = true;
      } else {
        logging.warn(
          'next() called multiple times - this may happen if you are invoking next() in an asynchronous handler',
        );
      }
    };

    if (this._actions[toRoute.name]) {
      this._actions[toRoute.name](toRoute, fromRoute, nextOnce);
    }
    if (!nextCalled) {
      next();
      nextCalled = true;
    }
  }

  initRouter(options = {}) {
    options.scrollBehavior = to => {
      if (typeof to.params.scrollTo === 'string') {
        // assume that `params.scrollTo` is a selector and that the top header will be shown
        return { selector: to.params.scrollTo, offset: { y: 70 } };
      } else {
        // otherwise assume that `params.scrollTo` is a `scrollBehavior` compatible object
        return to.params.scrollTo;
      }
    };
    if (this._vueRouter === null) {
      this._vueRouter = new VueRouter(options);
    }
  }

  initRoutes(routes) {
    this.initRouter();

    routes.forEach(route => {
      // if no name was passed but a component was, use the component's name
      if (!route.name && route.component) {
        route.name = route.component.name;
      }
      // if a handler was passed, associate it with the router using a beforeEach hook
      if (route.handler) {
        this._actions[route.name] = route.handler;
        delete route.handler;
      }
      // save a copy of the route names for later lookup
      this._routes[route.name] = route;
    });

    // add the routes to the router
    this._vueRouter.addRoutes(routes);

    // attach a helper method that generates a route object and warns if it's not valid
    this._vueRouter.getRoute = this.getRoute = (name, params = {}, query = {}) => {
      if (!this._routes[name]) {
        logging.warn(`Route name '${name}' is not registered`);
      }
      return { name, params, query };
    };

    // attach a helper method that returns original route definition
    this._vueRouter.getRouteDefinition = this.getRouteDefinition = name => {
      return this._routes[name];
    };

    // hooks up the special handling function
    this._vueRouter.beforeEach(this._hook.bind(this));

    // return a copy of underlying router
    return this._vueRouter;
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
    this.initRouter();
    return this._vueRouter.afterEach(func);
  }

  beforeResolve(func) {
    this.initRouter();
    return this._vueRouter.beforeResolve(func);
  }

  beforeEach(func) {
    this.initRouter();
    return this._vueRouter.beforeEach(func);
  }

  get currentRoute() {
    return this._vueRouter.currentRoute;
  }
}

const router = new Router();

export { router as default };
