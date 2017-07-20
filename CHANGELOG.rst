.. :changelog:

Release Notes
=============

Changes are ordered reverse-chronologically.


0.4.4
-----

 - Fix for Python 3 compatibility in Whl, Windows and Pex builds #1797


0.4.3
-----

 - Speed improvements for content recommendation #1798


0.4.2
-----  

 - Fixes for morango database migrations 


0.4.1
-----

 - Makes usernames for login case insensitive #1733 
 - Fixes various issues with exercise rendering #1757 
 - Removes wrong CLI usage instructions #1742


0.4
---

 - Class and group management
 - Learner reports #1464
 - Performance optimizations #1499
 - Anonymous exercises fixed #1466
 - Integrated Morango, to prep for data syncing (will require fresh database)
 - Adds Simplified Login support as a configurable facility flag


0.3.0
-----

 - Add support for nested URL structures in API Resource layer
 - Add Spanish and Swahili translations
 - Improve pipeline for translating plugins
 - Add search back in
 - Content Renderers use explicit new API rather than event-based loading


0.2.0
-----

 - Add authentication for tasks API
 - Temporarily remove 'search' functionality
 - Rename 'Learn/Explore' to 'Recommended/Topics'
 - Add JS-based 'responsive mixin' as alternative to media queries
 - Replace jeet grids with pure.css grids
 - Begin using some keen-ui components
 - Update primary layout and navigation
 - New log-in page
 - User sign-up and profile-editing functionality
 - Versioning based on git tags
 - Client heartbeat for usage tracking
 - Allow plugins to override core components
 - Wrap all user-facing strings for I18N
 - Log filtering based on users and collections
 - Improved docs
 - Pin dependencies with Yarn
 - ES2015 transpilation now Bublé instead of Babel
 - Webpack build process compatible with plugins outside the kolibri directory
 - Vue2 refactor
 - HTML5 app renderer


0.1.1
-----

 - SVG inlining
 - Exercise completion visualization
 - Perseus exercise renderer
 - Coach reports


0.1.0 - MVP
-----------

 - Improved documentation
 - Conditional (cancelable) JS promises
 - Asset bundling performance improvements
 - Endpoint indexing into zip files
 - Case-insensitive usernames
 - Make plugins more self-contained
 - Client-side router bug fixes
 - Resource layer smart cache busting
 - Loading 'spinner'
 - Make modals accessible
 - Fuzzy searching
 - Usage data export
 - Drive enumeration
 - Content interaction logging
 - I18N string extraction
 - Channel switching bug fixes
 - Modal popups
 - A11Y updates
 - Tab focus highlights
 - Learn app styling changes
 - User management UI
 - Task management
 - Content import/export
 - Session state and login widget
 - Channel switching
 - Setup wizard plugin
 - Documentation updates
 - Content downloading


0.0.1 - MMVP
------------

 - Page titles
 - Javascript logging module
 - Responsiveness updates
 - A11Y updates
 - Cherrypy server
 - Vuex integration
 - Stylus/Jeet-based grids
 - Support for multiple content DBs
 - API resource retrieval and caching
 - Content recommendation endpoints
 - Client-side routing
 - Content search
 - Video, Document, and MP3 content renderers
 - Initial VueIntl integration
 - User management API
 - Vue.js integration
 - Learn app and content browsing
 - Content endpoints
 - Automatic inclusion of requirements in a static build
 - Django JS Reverse with urls representation in kolibriGlobal object
 - Python plugin API with hooks
 - Webpack build pipeline, including linting
 - Authentication, authorization, permissions
 - Users, Collections, and Roles
