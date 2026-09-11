import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import qs from 'qs';
import { ref, shallowRef, computed } from 'vue';
import { toValue } from '@vueuse/core';
import urls from 'kolibri/urls';
import useFetch from 'kolibri/composables/useFetch';
import sanitizeError from './utils/sanitizeError';

// Serialize query parameters into a string that is stable regardless of key insertion order,
// so that two equivalent parameter objects produce the same in-flight request key.
const stableSerialize = params => qs.stringify(params, { sort: (a, b) => a.localeCompare(b) });

/**
 * Class representing a single API resource.
 * Can also be subclassed in order to create custom behaviour for particular API resources.
 */
export class Resource {
  /**
   * Create a resource with a Django REST API name corresponding to the name parameter.
   * @param {object} options - Configuration including `name`, `idKey`, `namespace` and any
   * additional properties to attach to the resource instance
   * @param {string} options.name - DRF router name for the resource endpoint
   * @param {string} [options.idKey] - Attribute used as the primary key (defaults to `id`)
   * @param {string} [options.namespace] - URL namespace prefix (defaults to `core`)
   */
  constructor({ name, idKey = 'id', namespace = 'core', ...options } = {}) {
    if (!name) {
      throw ReferenceError('Resource must be instantiated with a name property');
    }
    this.name = `kolibri:${namespace}:${name}`;
    this.idKey = idKey;
    const optionsDefinitions = Object.getOwnPropertyDescriptors(options);
    Object.keys(optionsDefinitions).forEach(key => {
      Object.defineProperty(this, key, optionsDefinitions[key]);
    });
    // Currently pending GET requests, keyed by resolved URL and query params. This is request
    // coalescing, not a cache - an entry is removed as soon as its request settles.
    this._inFlight = new Map();
  }

  /**
   * Resolve the URL for a named action, applying any route parameters.
   * @param {string} action - The name of the endpoint, as registered with the URL resolver
   * @param {object | Array | string | number} [routeParams] - An object is passed as named
   * kwargs, an array is spread as positional arguments, and any other value is passed as a
   * single positional argument. Omit for a route that takes no parameters.
   * @returns {string} - The resolved URL
   * @throws {ReferenceError} - When no URL is registered for this action
   */
  __resolveUrl(action, routeParams) {
    const urlFunction = this.getUrlFunction(action);
    if (!urlFunction) {
      throw ReferenceError(`No URL found for the ${action} action of the ${this.name} resource`);
    }
    if (routeParams === undefined || routeParams === null) {
      return urlFunction();
    }
    if (Array.isArray(routeParams)) {
      return urlFunction(...routeParams);
    }
    return urlFunction(routeParams);
  }

  /**
   * The single low-level primitive that every read, write, and custom action goes through.
   *
   * Concurrent identical GET requests share a single in-flight request. Writes are never
   * de-duplicated.
   * @param {object} [options] - The request definition
   * @param {string} [options.method=GET] - A valid HTTP method name
   * @param {string} [options.action=list] - The name of the endpoint to target
   * @param {object | Array | string | number} [options.routeParams] - Parameters for the URL
   * itself
   * @param {object} [options.params] - Query parameters
   * @param {object | Array} [options.data] - The request body, for writes
   * @param {boolean} [options.multipart=false] - Whether to encode the body as multipart form
   * data
   * @returns {Promise} - Promise that resolves with the full response object. A caller that
   * coalesces onto an in-flight GET receives a deep copy of `data` unique to it.
   */
  async request({
    method = 'GET',
    action = 'list',
    routeParams,
    params,
    data,
    multipart = false,
  } = {}) {
    const url = this.__resolveUrl(action, routeParams);
    // Log any request failure before re-raising it, so it surfaces with request context. This
    // only intercepts to log - the rejection still propagates to the caller unchanged.
    const logAndRethrow = error => {
      this.logError(error);
      throw error;
    };
    if (method.toUpperCase() !== 'GET') {
      // General case (writes): no dedup, as two writes are two distinct intents.
      return this.client({ url, method, params, data, multipart }).catch(logAndRethrow);
    }
    const key = `${url}?${stableSerialize(params)}`;
    const existing = this._inFlight.get(key);
    if (existing) {
      // Attached to an in-flight request another caller started - clone `data` so the two
      // callers don't share one mutable payload.
      return existing.then(response => ({ ...response, data: cloneDeep(response.data) }));
    }
    // Clear the entry once the request settles, whether it succeeded or failed - a lingering
    // rejected promise would poison every subsequent request for this key. `logError` runs on the
    // shared promise, so coalesced callers do not each re-log the same failure.
    const promise = this.client({ url, method, params })
      .catch(logAndRethrow)
      .finally(() => {
        this._inFlight.delete(key);
      });
    this._inFlight.set(key, promise);
    // The originating caller's payload is unshared by construction, so it needs no copy.
    return promise;
  }

  /**
   * Fetch a single object by id from the resource's default detail endpoint.
   * @param {string} id - The id of the object to fetch
   * @param {object} [options] - Additional request options
   * @param {object} [options.params] - Query parameters
   * @returns {Promise} - Promise that resolves with the object
   * @throws {TypeError} - When `id` is missing
   */
  async retrieve(id, { params } = {}) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    const response = await this.request({ action: 'detail', routeParams: id, params });
    return response.data;
  }

  /**
   * Fetch a collection of objects from the resource's default list endpoint. A custom
   * list-shaped endpoint (e.g. a detail route that returns a collection) is authored as its
   * own method over `request`, not through here.
   * @param {object} [params] - Query parameters
   * @returns {Promise} - Promise that resolves with the server's response data - either an
   * array of objects, or a `{ results, more, count }` object when the endpoint is paginated
   */
  async list(params = {}) {
    const response = await this.request({ params });
    return response.data;
  }

  /**
   * Create a single object against the resource's default list endpoint.
   * @param {object} data - The object to create
   * @param {boolean} [multipart=false] - Whether to encode the body as multipart form data
   * @returns {Promise} - Promise that resolves with the created object
   */
  async create(data, multipart = false) {
    const response = await this.request({ method: 'POST', data, multipart });
    return response.data;
  }

  /**
   * Update an object. When a `baseline` snapshot is provided, only the fields that differ from
   * it are sent, and an unchanged object issues no request at all.
   * @param {string} id - The id of the object to update
   * @param {object} data - The fields to update
   * @param {object} [options] - Additional request options
   * @param {object} [options.params] - Query parameters
   * @param {object} [options.baseline] - The last server snapshot of this object. When present,
   * `data` is diffed against it and only changed fields are sent; when omitted (or falsy),
   * `data` is sent unchanged.
   * @returns {Promise} - Promise that resolves with the updated object
   * @throws {TypeError} - When `id` is missing
   */
  async update(id, data = {}, { params, baseline } = {}) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    let payload = data;
    if (baseline) {
      payload = {};
      for (const key of Object.keys(data)) {
        if (!isEqual(data[key], baseline[key])) {
          payload[key] = data[key];
        }
      }
      if (!Object.keys(payload).length) {
        // Nothing changed, so there is nothing to send.
        return cloneDeep(baseline);
      }
    }
    const response = await this.request({
      method: 'PATCH',
      action: 'detail',
      routeParams: id,
      params,
      data: payload,
    });
    return response.data;
  }

  /**
   * Delete a single object by id.
   * @param {string} id - The id of the object to delete
   * @param {object} [options] - Additional request options
   * @param {object} [options.params] - Query parameters
   * @returns {Promise} - Promise that resolves with the id of the deleted object
   * @throws {TypeError} - When `id` is missing
   */
  async delete(id, { params } = {}) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    await this.request({ method: 'DELETE', action: 'detail', routeParams: id, params });
    return id;
  }

  /**
   * Create several objects in a single request against the resource's default list endpoint.
   * Only works for resources whose endpoint accepts an array payload.
   * @param {object[]} data - The objects to create
   * @param {boolean} [multipart=false] - Whether to encode the body as multipart form data
   * @returns {Promise} - Promise that resolves with the created objects
   * @throws {TypeError} - When `data` is not an array
   */
  async bulkCreate(data, multipart = false) {
    if (!Array.isArray(data)) {
      throw TypeError('An array of objects must be specified');
    }
    const response = await this.request({ method: 'POST', data, multipart });
    return response.data;
  }

  /**
   * Delete every object matching the given query parameters, against the resource's default
   * list endpoint.
   * @param {object} params - Query parameters narrowing what will be deleted
   * @returns {Promise} - Promise that resolves with the server's response data
   * @throws {TypeError} - When no query parameters are given, to prevent an unfiltered
   * bulk delete
   */
  async bulkDelete(params = {}) {
    if (!Object.keys(params).length) {
      throw TypeError('Params must be specified to narrow what is being deleted');
    }
    const response = await this.request({ method: 'DELETE', params });
    return response.data;
  }

  /**
   * @typedef {object} RetrieveObject
   * @property {import('vue').Ref<object|null>} data - The retrieved object, or `null` before the
   * first successful fetch.
   * @property {import('vue').Ref<boolean>} loading - Whether a fetch is currently in flight.
   * @property {import('vue').Ref<?object>} error - The error from the last fetch, or `null`.
   * @property {() => Promise<void>} fetchData - Trigger the fetch. Takes no arguments - reads the
   * bound `id`/`params` at call time.
   */

  /**
   * Reactive read of a single object by id, layered on `useFetch`.
   * Data is not refetched when the params change, caller must call `fetchData` again.
   * @param {string | import('vue').Ref<string> | (() => string)} id - The id of the object to
   * retrieve. A ref or getter is read at fetch time (not watched).
   * @param {object} [options] - Additional options.
   * @param {object | import('vue').Ref<object> | (() => object)} [options.params] - Query
   * parameters passed to `retrieve`. A ref or getter is read at fetch time (not watched).
   * @param {(object: object) => void} [options.onSuccess] - Called with the retrieved object
   * after each successful fetch. When pairing with `useUpdate`, seed both the working data and the
   * baseline here - `onSuccess: obj => { form.value = { ...obj }; setBaseline(obj); }` - so they
   * start in sync; setting the baseline alone leaves `isDirty` true until the working data is
   * populated.
   * @returns {RetrieveObject} The single-object fetch state and action.
   */
  useRetrieve(id, { params, onSuccess } = {}) {
    const { data, loading, error, fetchData } = useFetch({
      fetchMethod: () => this.retrieve(toValue(id), { params: toValue(params) }),
      onSuccess,
    });
    return { data, loading, error, fetchData };
  }

  /**
   * Reactive read of a collection, layered on `useFetch`.
   * Data is not refetched when the params change, caller must call `fetchData` again.
   *
   * Pagination is driven by the endpoint's shape, and the two backend styles map to two usage
   * modes:
   *  - cursor / limit-offset endpoints emit a `more` cursor: append the next page with
   *    `fetchMore()`, gated by `hasMore` (infinite scroll).
   *  - page-number endpoints emit `page`/`total_pages`: show one page at a time by updating the
   *    page in `params` and re-calling `fetchData()`, reading `page`/`totalPages` for the pager.
   *    `hasMore`/`fetchMore` do not apply to these (`hasMore` stays `false`).
   * @param {object | import('vue').Ref<object> | (() => object)} [params] - Query parameters
   * passed to `list`. A ref or getter is read at fetch time (not watched).
   * @param {object} [options] - Additional options.
   * @param {(response: object) => void} [options.onSuccess] - Called with the raw list response
   * after each successful `fetchData` - an array, or a `{ results, more, count }` /
   * `{ results, page, total_pages, count }` object when paginated. Not called for `fetchMore`,
   * so a consumer mirroring results into a cache must handle appended pages separately.
   * @returns {import('kolibri/composables/useFetch').FetchObject} The fetch state and actions.
   * The returned `fetchData` takes no arguments.
   */
  useList(params, { onSuccess } = {}) {
    return useFetch({
      fetchMethod: () => this.list(toValue(params)),
      onSuccess,
      // `more` is the complete set of query parameters for the next page, so it replaces
      // rather than extends the original params.
      fetchMoreMethod: more => this.list(more),
    });
  }

  /**
   * @typedef {object} UpdateObject
   * @property {import('vue').Ref<boolean>} isSaving - Whether a write is in flight. Stays true
   * until the latest-issued write settles. The latest-issued write only wins the local
   * bookkeeping (baseline / `isSaving` / `error`); writes are not serialised on the wire, so a
   * rapidly re-issued save can still race server-side.
   * @property {import('vue').Ref<Error|null>} error - The error from the last write, or `null`. On
   * failure `create()`/`update()` set this and also reject.
   * @property {import('vue').ComputedRef<boolean>} isDirty - Whether the working `data` differs
   * from the last saved snapshot - the unsaved-changes signal an editor needs. Only meaningful
   * when `data` has the same shape as the server object; a `data` that is a projection of a larger
   * object reads dirty against the fuller baseline. On load, seed the working data alongside the
   * baseline (see `useRetrieve`'s `onSuccess`), or this reads true before any edit.
   * @property {(object: object|null) => void} setBaseline - Adopt a server snapshot as the
   * baseline `update` diffs against (deep-copied); pass `null` to forget it. Typically wired to
   * `useRetrieve`'s `onSuccess` to record the baseline on load.
   * @property {() => Promise<object>} create - POST the bound `data` and record the created object
   * as the next baseline. Rejects if the bound `id` is already set.
   * @property {() => Promise<object>} update - PATCH only the fields of `data` that differ from
   * the baseline. Rejects if the bound `id` is empty.
   * @property {() => Promise<object>} save - Dispatch on the bound `id`: `create()` when empty,
   * `update()` otherwise, so call sites need not branch.
   */

  /**
   * A write helper bound to a single object of this resource, scoped to the calling component.
   * Rather than taking the object per call, the identity (`id`) and the working payload (`data`)
   * are bound once here, so this composable is bound to a single object at a time, never arbitrary
   * items. After `create()` resolves, the caller can set the new `id` to keep editing the same
   * object.
   *
   *  - when `id` is empty, `create()` is valid and `update()` rejects;
   *  - when `id` is set, `update()` is valid and `create()` rejects.
   *
   * `create()`, `update()`, and `save()` take no arguments - they read the bound refs at call
   * time.
   * @param {string | import('vue').Ref<string> | (() => string)} id - The object's id, or empty
   * for a not-yet-created object. A ref or getter is read at call time (not watched).
   * @param {object | import('vue').Ref<object> | (() => object)} data - The working payload to
   * send. A ref or getter is read at call time (not watched).
   * @param {object} [options] - Additional options.
   * @param {object | import('vue').Ref<object> | (() => object)} [options.params] - Query
   * parameters for `update`.
   * @param {boolean} [options.multipart] - Whether `create` should send multipart form data.
   * @returns {UpdateObject} The write state and actions.
   */
  useUpdate(id, data, { params, multipart } = {}) {
    const isSaving = ref(false);
    const error = ref(null);
    // The last server snapshot. Written only through setBaseline / create / update; reactive so
    // `isDirty` can derive from it (shallow is enough - it is replaced wholesale, never mutated).
    const baseline = shallowRef(null);

    // Store a full copy, so later mutation of the caller's object cannot corrupt the snapshot
    // we diff against.
    const setBaseline = object => {
      baseline.value = object == null ? null : cloneDeep(object);
    };

    // True when the working `data` differs from the last saved snapshot. Only meaningful when
    // `data` has the same shape as the server object; a `data` that is a projection of a larger
    // object (e.g. a subset of fields) will read dirty against the fuller baseline.
    const isDirty = computed(
      () => baseline.value != null && !isEqual(toValue(data), baseline.value),
    );

    // A monotonic token, captured per call and re-checked before touching shared state, so a
    // superseded write's out-of-order response cannot record a stale baseline (which would make
    // the next diff short-circuit to a silent no-op) or flip isSaving/error for a call still in
    // flight.
    let writeCount = 0;
    const run = async request => {
      const current = ++writeCount;
      isSaving.value = true;
      error.value = null;
      try {
        const saved = await request();
        // The saved object is the freshest server truth, so it becomes the next baseline.
        if (current === writeCount) {
          setBaseline(saved);
        }
        return saved;
      } catch (e) {
        if (current === writeCount) {
          error.value = e;
        }
        throw e;
      } finally {
        if (current === writeCount) {
          isSaving.value = false;
        }
      }
    };

    const create = () => {
      if (toValue(id)) {
        return Promise.reject(
          TypeError('create() called for an object that already has an id; use update()'),
        );
      }
      return run(() => this.create(toValue(data), multipart));
    };

    const update = () => {
      const currentId = toValue(id);
      if (!currentId) {
        return Promise.reject(TypeError('update() called without an id; use create()'));
      }
      // Only diff against the baseline when it belongs to the object currently bound. If `id`
      // was rebound before a fresh baseline was installed, a stale baseline from the previous
      // object could silently drop fields whose edited value coincides with the old one; a
      // mismatched baseline degrades to a full PATCH, which is always correct.
      const currentBaseline =
        baseline.value != null && String(baseline.value[this.idKey]) === String(currentId)
          ? baseline.value
          : undefined;
      return run(() =>
        this.update(currentId, toValue(data), {
          params: toValue(params),
          baseline: currentBaseline,
        }),
      );
    };

    // Dispatch on the bound id so call sites need not branch: create a not-yet-persisted
    // object, otherwise update the existing one.
    const save = () => (toValue(id) ? update() : create());

    return { isSaving, error, isDirty, setBaseline, create, update, save };
  }

  get urls() {
    return urls;
  }

  getUrlFunction(endpoint) {
    return this.urls[`${this.name}_${endpoint}`];
  }

  client(options) {
    // eslint-disable-next-line import-x/no-commonjs
    const client = require('kolibri/client').default;
    return client(options);
  }

  logError(err) {
    // eslint-disable-next-line import-x/no-commonjs
    const router = require('kolibri/router').default;
    // Only log what we can describe. A network failure (or a cancellation) has no `response`, so
    // reading `err.response.statusText` below would throw and mask the real error - bail early.
    if (!err.config || !err.response) {
      return;
    }
    const sanitized = sanitizeError(err);
    /* eslint-disable no-console */
    console.groupCollapsed(
      `%cRequest error: ${err.response.statusText}, ${
        err.response.status
      } for ${err.config.method.toUpperCase()} to ${err.config.url} - open for more info`,
      'color: red',
    );
    console.log(`Error occured for ${this.name} resource on page ${window.location.href}`);
    const currentRoute = router.currentRoute;
    if (currentRoute) {
      console.group('Vue Router');
      console.log(`fullPath: ${currentRoute.fullPath}`);
      console.log(`Route name: ${currentRoute.name}`);
      if (Object.keys(currentRoute.params).length) {
        console.group('Vue router params');
        for (const [k, v] of Object.entries(currentRoute.params)) {
          console.log(`${k}: ${v}`);
        }
        console.groupEnd();
      }
      console.groupEnd();
    }
    if (sanitized.config?.params && Object.keys(sanitized.config.params).length) {
      console.group('Query parameters');
      for (const [k, v] of Object.entries(sanitized.config.params)) {
        console.log(`${k}: ${v}`);
      }
      console.groupEnd();
    }
    if (sanitized.config?.data) {
      try {
        const data = JSON.parse(sanitized.config.data);
        if (Object.keys(data).length) {
          console.group('Data');
          for (const [k, v] of Object.entries(data)) {
            console.log(`${k}: ${v}`);
          }
          console.groupEnd();
        }
      } catch (e) {} // eslint-disable-line no-empty
    }
    if (sanitized.config?.headers && Object.keys(sanitized.config.headers).length) {
      console.group('Headers');
      for (const [k, v] of Object.entries(sanitized.config.headers)) {
        console.log(`${k}: ${v}`);
      }
      console.groupEnd();
    }
    console.trace('Traceback for request');
    console.groupEnd();
    /* eslint-enable */
  }
}
