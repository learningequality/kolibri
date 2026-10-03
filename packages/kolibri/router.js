import VueRouter, { START_LOCATION, isNavigationFailure } from 'vue-router';
import { nextTick, shallowReactive } from 'vue';
import logger from 'kolibri-logging';
import { focusPageHeading } from 'kolibri/composables/usePageTitle';

const logging = logger.getLogger(__filename);

function resolveNavigationFailure(error) {
  if (process.env.NODE_ENV === 'production' && isNavigationFailure(error)) {
    return error;
  }
  throw error;
}

// vue-router 3 gives each route only its own record's meta, so a panel's child routes are
// found through `matched`.
function panelIndex(route) {
  return route.matched.findIndex(record => record.meta.panel);
}

// Closing can land on a sibling of the panel, as when the host route redirects to a tab.
function closesPanel(to, from) {
  const index = panelIndex(from);
  return index > 0 && to.matched[index - 1] === from.matched[index - 1];
}

function staysOnKeepFocusRoute(to, from) {
  const index = to.matched.findIndex(record => record.meta.keepFocus);
  if (index === -1 || to.matched.length !== from.matched.length) {
    return false;
  }
  const record = to.matched[index];
  const fromRecord = from.matched[index];
  return (
    fromRecord.meta.keepFocus &&
    (fromRecord === record || (record.parent && fromRecord.parent === record.parent))
  );
}

// A page that replaces its own route after its data loads stays mounted. A replace made while
// handling input is the user's, as from a Next button, so focus still moves.
// Kept as the target path: a replace that fails, as when redundant, never reaches afterEach.
let replacedPath = null;
function replacesOwnRoute(to, from) {
  return (
    to.fullPath === replacedPath &&
    to.matched.length === from.matched.length &&
    to.matched.every(
      (record, i) => record.components.default === from.matched[i].components.default,
    )
  );
}

// Navigations before the user's first input belong to page load, such as a handler's redirect.
// Screen readers in browse mode activate links with a bare `click`.
let userHasActed = false;
// True only for the task that dispatched the input, so input during a page's load does not
// claim the replace the page makes once its data arrives.
let handlingInput = false;
function listenForInput() {
  for (const type of ['keydown', 'pointerdown', 'click']) {
    document.addEventListener(
      type,
      () => {
        userHasActed = true;
        if (!handlingInput) {
          handlingInput = true;
          setTimeout(() => {
            handlingInput = false;
          });
        }
      },
      { capture: true },
    );
  }
}

// A panel focuses its own first element, and gives focus back to its opener when it closes.
function moveFocusToPage(to, from) {
  const replaced = replacesOwnRoute(to, from);
  replacedPath = null;
  if (
    replaced ||
    from === START_LOCATION ||
    !userHasActed ||
    to.path === from.path ||
    panelIndex(to) !== -1
  ) {
    return;
  }
  if (closesPanel(to, from)) {
    // Runs after the panel's own return-focus timeout. Focus is left on <body> when the opener
    // was not on this page, as after a reload on the panel's URL.
    nextTick(() =>
      setTimeout(() => {
        if (document.activeElement === document.body) {
          focusPageHeading();
        }
      }),
    );
    return;
  }
  if (staysOnKeepFocusRoute(to, from)) {
    return;
  }
  const focused = document.activeElement;
  nextTick(() => {
    // Otherwise the new page has focused an element itself, such as an autofocused field.
    if (document.activeElement === focused || document.activeElement === document.body) {
      focusPageHeading();
    }
  });
}

/**
 * Wrapper around Vue Router.
 * Implements URL mapping to route handlers in addition to Vue components.
 * Otherwise intended as a mostly transparent replacement to vue-router.
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
      for (const method of ['push', 'replace']) {
        const navigate = this._vueRouter[method].bind(this._vueRouter);
        this._vueRouter[method] = (location, ...args) => {
          replacedPath =
            method === 'replace' && !handlingInput
              ? this._vueRouter.resolve(location).route.fullPath
              : null;
          return navigate(location, ...args)?.catch(resolveNavigationFailure);
        };
      }
      listenForInput();
      this._vueRouter.afterEach(moveFocusToPage);
    }
  }

  /**
   * Adds routes. After each page change the router focuses the page's <h1>, except when a page
   * replaces its own route outside the task that handled the user's input, or when the routes'
   * matched records set these `meta` flags:
   * - `panel`: a side panel or modal route; opening and closing it leaves focus to the panel.
   * - `keepFocus`: a param change on the same route, or a switch to a sibling route that also
   *   sets it, keeps focus on in-page controls such as tabs.
   * @param {Array<object>} routes - vue-router route configs.
   * @returns {VueRouter} The underlying vue-router instance.
   */
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

  /**
   * Generates a route object and warns if it's not valid
   * @function getRoute
   * @param {string} name - The name of the route
   * @param {object} [params] - The route parameters object
   * @param {object} [query] - The route query object
   * @returns {{name: string, params: object, query: object}} The route object
   */

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
    return this._vueRouter?.currentRoute || null;
  }
}

const router = new Router();

// Reactive route state for Vuex getters that run outside Vue component setup().
// Mirrors the internal pattern of vue-router/composables useRoute():
// a reactive object updated via afterEach so Vuex getters track route changes.
let _reactiveRoute = null;
export function getReactiveRoute() {
  if (!_reactiveRoute) {
    _reactiveRoute = shallowReactive({
      params: {},
      query: {},
      name: null,
      path: '',
      fullPath: '',
      hash: '',
      meta: {},
      matched: [],
      ...router.currentRoute,
    });
    router.afterEach(to => {
      Object.assign(_reactiveRoute, to);
    });
  }
  return _reactiveRoute;
}

export { router as default };
