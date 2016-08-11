
const Vue = require('vue');
const VueRouter = require('vue-router');

Vue.use(VueRouter);


/** Wrapper around Vue Router.
 *  Implements URL mapping to functions rather than Vue components.
 */
class Router {
  /**
   * Create a Router instance.
   */
  constructor() {
    this._vueRouter = new VueRouter({
      history: false, // do not use the HTML5 history API
    });

    // registry of actions
    this._actions = {};

    // hack: _hook seems to get unbound without `.bind(this)`
    this._vueRouter.beforeEach(this._hook.bind(this));
  }

  _hook(transitionObject) {
    this._actions[transitionObject.to.name](
      transitionObject.to,
      transitionObject.from
    );
    transitionObject.next();
  }

  /**
   * Set up a route
   * @param name - http://router.vuejs.org/en/named.html
   * @param path - http://router.vuejs.org/en/route.html#route-matching
   * @param action - function to call. Passed parameters will be:
   *  - 'to' route
   *  - 'from' route
   */
  on(name, path, action) {
    // Hook up a route with an empty component - actual switching
    // happens in the actions and resulting view updates.
    this._vueRouter.on(path, { name, component: {} });
    this._actions[name] = action;
  }

  go(options) {
    this._vueRouter.go(options);
  }

  redirect(options) {
    this._vueRouter.redirect(options);
  }

  start(vm, selector) {
    this._vueRouter.start(vm, selector);
  }
}

module.exports = new Router();
