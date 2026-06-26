# Working with URLs and API Endpoints

This guide explains how to work with URLs and API endpoints in Kolibri, including the URL namespacing system used throughout the codebase.

## Overview

Kolibri uses a consistent URL namespacing pattern that bridges Django's backend URL system with JavaScript frontend code. This allows type-safe URL construction with automatic parameter validation across the entire stack.

## URL Naming Convention

All URLs in Kolibri follow the namespace pattern:

```
kolibri:<plugin_module>:<url_name>
```

Where:
- `kolibri` is the app namespace (always constant)
- `<plugin_module>` is either `core` for core Kolibri functionality, or the full plugin module path (e.g., `kolibri.plugins.coach`) for plugins
- `<url_name>` is the specific URL name (for ViewSets, this is typically `<basename>_list` or `<basename>_detail`)

### Core URLs

Core Kolibri URLs use `core`:

```
kolibri:core:session_list                    # ViewSet list endpoint
kolibri:core:session_detail                  # ViewSet detail endpoint
kolibri:core:facilityuser_list               # ViewSet list endpoint
kolibri:core:contentnode_recommendations_for # ViewSet custom action
kolibri:core:usernameavailable               # Non-ViewSet custom URL
kolibri:core:deleteimporteduser              # Non-ViewSet custom URL
```

### Plugin URLs

Plugin URLs use the full plugin module path as the namespace:

```
kolibri:kolibri.plugins.coach:lessonreport_list       # ViewSet list endpoint
kolibri:kolibri.plugins.learn:learnerlesson_detail    # ViewSet detail endpoint
kolibri:kolibri.plugins.device:devicepermissions_list # ViewSet list endpoint
```

### ViewSet URL Patterns

Django REST Framework ViewSets automatically generate two standard URL names:

- `<basename>_list` - List/create endpoint (GET/POST)
- `<basename>_detail` - Detail/update/delete endpoint (GET/PUT/PATCH/DELETE)

Custom actions on ViewSets create additional URL names using the pattern `<basename>_<action_name>`:

```python
from rest_framework.decorators import action

class ContentNodeViewSet(viewsets.ReadOnlyModelViewSet):
    basename = "contentnode"

    @action(detail=True, methods=['get'])
    def recommendations_for(self, request, pk=None):
        # Creates: kolibri:core:contentnode_recommendations_for
        # The detail=True means it accepts a pk parameter
        pass

    @action(detail=False, methods=['get'])
    def random(self, request):
        # Creates: kolibri:core:contentnode_random
        # The detail=False means no pk parameter
        pass
```

The `detail` parameter controls whether the action operates on a single item (`detail=True`, requires pk) or the collection (`detail=False`, no pk required), but does NOT affect the URL name - it's always `<basename>_<action_name>`.

## Backend: Defining URLs

### Core App URLs

Core API URLs are organized by module in separate `api_urls.py` files. By convention (not a requirement), each core app that has API endpoints has its own `api_urls.py` file:

- `kolibri/core/auth/api_urls.py` - Authentication, users, facilities, sessions
- `kolibri/core/content/api_urls.py` - Content nodes, channels
- `kolibri/core/device/api_urls.py` - Device settings, permissions
- `kolibri/core/logger/api_urls.py` - Logging endpoints
- `kolibri/core/exams/api_urls.py` - Exam management
- `kolibri/core/lessons/api_urls.py` - Lesson management
- And others...

Here's an example from `kolibri/core/auth/api_urls.py`:

```python
from rest_framework import routers

router = routers.SimpleRouter()

# This creates:
# - kolibri:core:session_list
# - kolibri:core:session_detail
router.register(r"session", SessionViewSet, basename="session")

# This creates:
# - kolibri:core:facilityuser_list
# - kolibri:core:facilityuser_detail
router.register(r"facilityuser", FacilityUserViewSet, basename="facilityuser")
urlpatterns = router.urls
```

The `basename` parameter determines the URL name pattern.

**How the namespace is created:**

The `kolibri:core` namespace is created through Django's URL configuration in `kolibri/core/urls.py`:
- The module sets `app_name = "kolibri"` (the first part)
- Core URLs use tuple syntax: `core_urlpatterns = ([...], "core")` (the second part)
- Result: `app_name` + tuple namespace = `kolibri:core`

All core app `api_urls.py` modules are aggregated in `kolibri/core/api_urls.py` and included in the core URL configuration.

### Plugin URLs

Plugin API URLs require two components: defining the URLs in a module (by convention named `api_urls.py`) and registering that module with the plugin class.

**Step 1: Define the URLs module**

Create a module (conventionally named `api_urls.py`, but the name is not required) with your URL patterns:

```python
# kolibri/plugins/coach/api_urls.py
from rest_framework import routers

router = routers.DefaultRouter()

# This creates:
# - kolibri:kolibri.plugins.coach:lessonreport_list
# - kolibri:kolibri.plugins.coach:lessonreport_detail
router.register(r"lessonreport", LessonReportViewset, basename="lessonreport")

urlpatterns = router.urls
```

**Step 2: Register the module with your plugin class**

In your plugin's `kolibri_plugin.py`, set the `untranslated_view_urls` attribute to the name of your URL module:

```python
# kolibri/plugins/coach/kolibri_plugin.py
from kolibri.plugins import KolibriPluginBase

class Coach(KolibriPluginBase):
    untranslated_view_urls = "api_urls"  # Name of the module, not a path
    # ... other plugin configuration
```

**How the namespace is created:**

The plugin's namespace is automatically derived from its module path (e.g., `kolibri.plugins.coach`). The plugin registration system in `kolibri/plugins/utils/urls.py` wraps each plugin's URLs with its module path as the namespace, creating URLs like `kolibri:kolibri.plugins.coach:lessonreport_list`.

**Important:** Simply having an `api_urls.py` file is not enough - the plugin class MUST set the `untranslated_view_urls` attribute to register those URLs.

### Custom URL Patterns

For non-ViewSet URLs, define them with a `name` parameter:

```python
from django.urls import re_path

urlpatterns = [
    re_path(
        r"^usernameavailable$",
        UsernameAvailableView.as_view(),
        name="usernameavailable",
    ),
    re_path(
        r"^deleteimporteduser/(?P<user_id>[a-f0-9]{32})$",
        DeleteImportedUserView.as_view(),
        name="deleteimporteduser",
    ),
]
```

These will be accessible as:
- `kolibri:core:usernameavailable`
- `kolibri:core:deleteimporteduser`

## Frontend: Using URLs

### Direct URL Function Access

The most common way to use URLs in frontend code is to import the `urls` object and call URL functions directly:

```javascript
import urls from 'kolibri/urls';
import client from 'kolibri/client';

// List endpoint (no parameters)
const response = await client({
  url: urls['kolibri:core:session_list'](),
  method: 'GET',
});

// Detail endpoint (with parameter)
const response = await client({
  url: urls['kolibri:core:session_detail'](sessionId),
  method: 'GET',
});

// Custom endpoint with parameter
const response = await client({
  url: urls['kolibri:core:deleteimporteduser'](userId),
  method: 'DELETE',
});
```

### Using API Resources

API Resources provide a higher-level abstraction that automatically handles URL namespacing:

```javascript
import { Resource } from 'kolibri/apiResource';

// Create a resource for the 'facilityuser' ViewSet in the 'core' namespace
const FacilityUserResource = new Resource({
  name: 'facilityuser',
  namespace: 'core',  // defaults to 'core' if not specified
});

// The Resource automatically constructs: 'kolibri:core:facilityuser'
// and uses _list and _detail suffixes for endpoints

// Fetch a collection (calls kolibri:core:facilityuser_list)
const users = await FacilityUserResource.fetchCollection();

// Fetch a single model (calls kolibri:core:facilityuser_detail)
const user = await FacilityUserResource.fetchModel({ id: userId });

// Save a model
await FacilityUserResource.saveModel({
  id: userId,
  data: { username: 'newname' },
});
```

For plugin resources:

```javascript
import { Resource } from 'kolibri/apiResource';

// Create a resource for a plugin ViewSet
const LessonReportResource = new Resource({
  name: 'lessonreport',
  namespace: 'kolibri.plugins.coach',
});

// This constructs: 'kolibri:kolibri.plugins.coach:lessonreport'
```

### Custom Methods on Resources

Resources can have custom methods that use specific URL endpoints:

```javascript
import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';
import client from 'kolibri/client';

const FacilityUserResource = new Resource({
  name: 'facilityuser',

  // Custom method using a specific URL
  removeImportedUser(user_id) {
    return client({
      url: urls['kolibri:core:deleteimporteduser'](user_id),
      method: 'DELETE',
    });
  },

  async listRemoteFacilityLearners(params) {
    const { data } = await client({
      url: urls['kolibri:core:remotefacilityauthenticateduserinfo'](),
      method: 'POST',
      data: params,
    });
    return data;
  },
});
```

## How URL Resolution Works

### Backend to Frontend Pipeline

1. **Django URL Registration**
   - ViewSets are registered with REST Framework routers using a `basename`
   - Django generates URL names like `kolibri:core:session_list`

2. **JavaScript URL Generation**
   - The `django-js-reverse` package converts Django URLs to JavaScript
   - URL patterns with parameters are converted to template strings (e.g., `"/api/auth/session/%(id)s/"`)
   - This data is injected into the `kolibriCoreAppGlobal.urls` object

3. **Frontend URL Resolution**
   - The `UrlResolver` class (in `packages/kolibri/urls.js`) reads the URL patterns
   - It creates functions that accept parameters and return complete URLs
   - A Proxy is used to provide dynamic property access for all URL functions

4. **Caching and Performance**
   - URL functions are cached after first access
   - Parameter validation ensures the correct URL pattern is selected
   - Supports both positional and named parameters

### Example Flow

```
Backend:                                       Frontend:
─────────                                      ──────────

router.register(                               urls['kolibri:core:session_detail']('abc123')
  r"session",                                              ↓
  SessionViewSet,                              Looks up pattern: "/api/auth/session/%(id)s/"
  basename="session"                                       ↓
)                                              Substitutes parameter: "/api/auth/session/abc123/"
          ↓                                                ↓
Django creates URLs:                           Returns complete URL
- kolibri:core:session_list
- kolibri:core:session_detail
          ↓
django-js-reverse converts to JavaScript
          ↓
kolibriCoreAppGlobal.urls = {
  "kolibri:core:session_detail": [
    ["/api/auth/session/%(id)s/", ["id"]]
  ]
}
```

## Best Practices

### 1. Use the Correct Abstraction Level

- **Direct URL access**: Use when you need fine-grained control or are making one-off requests
  ```javascript
  const response = await client({
    url: urls['kolibri:core:session_list'](),
  });
  ```

- **API Resources**: Use for standard CRUD operations on a ViewSet
  ```javascript
  const data = await MyResource.fetchCollection({ getParams: { page: 1 } });
  ```

### 2. Always Use URL Namespacing

Never hard-code URLs:

```javascript
// ❌ BAD - Hard-coded URL
const url = '/api/auth/session/';

// ✅ GOOD - Use URL namespacing
const url = urls['kolibri:core:session_list']();
```

### 3. Provide All Required Parameters

URL functions will throw errors if required parameters are missing:

```javascript
// ❌ BAD - Missing required parameter
const url = urls['kolibri:core:session_detail']();  // Error!

// ✅ GOOD - All parameters provided
const url = urls['kolibri:core:session_detail'](sessionId);
```

### 4. Use Consistent Basenames

The `basename` in the backend router must match the `name` in the frontend Resource:

```python
# Backend
router.register(r"facilityuser", FacilityUserViewSet, basename="facility_user")
```

```javascript
// Frontend
const resource = new Resource({ name: 'facility_user' });
```

### 5. Use Underscores, Not Dashes

URL pattern names should use underscores for consistency:

```python
# ✅ GOOD
router.register(r"facility-user", FacilityUserViewSet, basename="facility_user")

# ❌ BAD (will cause errors)
router.register(r"facility-user", FacilityUserViewSet, basename="facility-user")
```

### 6. Guard access to cross plugin URLs

URL functions will not exist if the plugin is disabled, so if you are referencing another plugin's URLs you must allow for the fact its function might not exist:

```javascript
// ❌ BAD - Undefined is not a function!
const url = urls['kolibri:kolibri.plugins.device:device']();

// ✅ GOOD - no error, but url is null if disabled
const urlFn = urls['kolibri:kolibri.plugins.device:device'];
const url = urlFn ? urlFn() : null;
```

## Debugging URL Issues

### Check Available URLs

In the browser console, you can inspect all available URLs:

```javascript
import urls from 'kolibri/urls';

// Get the raw URL patterns
console.log(urls._patterns);

// Test a specific URL function
console.log(urls['kolibri:core:session_list']());
// Output: "/api/auth/session/"
```

### Common Errors

**Error: "Could not find matching URL pattern"**
- The URL name doesn't exist in Django's URL configuration
- Check that the ViewSet is registered with the correct `basename`
- Check that the URL module is included in the main URL configuration

**Error: "URL pattern names should use underscores instead of dashes"**
- The `basename` contains a dash instead of an underscore
- Update the `basename` in the backend router to use underscores

**Error: "Required parameter missing"**
- A URL function was called without all required parameters
- Check the URL pattern to see which parameters are required

## Advanced Topics

### Custom Detail Endpoints

Resources support fetching custom detail endpoints (custom actions on a specific model):

```javascript
// Backend: @action(detail=True, methods=['get'])
// def recommendations_for(self, request, pk=None)
// Creates: kolibri:core:contentnode_recommendations_for

const data = await ContentNodeResource.fetchDetailModel(
  'recommendations_for',  // action name
  nodeId,                 // id parameter
  {}                      // getParams
);
```

### Custom List Endpoints

Resources support fetching custom list endpoints (custom actions on the collection):

```javascript
// Backend: @action(detail=False, methods=['get'])
// def random(self, request)
// Creates: kolibri:core:contentnode_random

const data = await ContentNodeResource.fetchListCollection(
  'random',  // action name
  {}         // getParams
);
```

### Accessing Endpoints Without Resources

For complete control, use the `accessListEndpoint` or `accessDetailEndpoint` methods:

```javascript
// List endpoint
const response = await MyResource.accessListEndpoint(
  'POST',
  'import',
  { data: someData }
);

// Detail endpoint
const response = await MyResource.accessDetailEndpoint(
  'POST',
  'copy',
  itemId,
  { params: someParams }
);
```

## Related Documentation

- Frontend Architecture: [Core Functionality](../frontend_architecture/core.rst)
- Backend Architecture: [Plugins](../backend_architecture/plugins.rst)
- Django Documentation: [URL namespaces](https://docs.djangoproject.com/en/stable/topics/http/urls/#url-namespaces)
- Django REST Framework: [Routers](https://www.django-rest-framework.org/api-guide/routers/)
