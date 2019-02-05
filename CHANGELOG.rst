Release Notes
=============

List of the most important changes for each release.


0.12.0
------

Internationalization and localization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 - Languages: English, Arabic, Bengali, Bulgarian, Chinyanja, Farsi, French, Fulfulde Mbororoore, Hindi, Marathi, Portuguese (Brazilian), Spanish, Swahili, Telugu, Urdu, Vietnamese, and Yoruba


See a `full list <https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.0>`__ of changes on Github


0.11.1
------

Added
~~~~~

 - Support for RTL EPubs
 - Support for Python 3.7

Changed or fixed
~~~~~~~~~~~~~~~~

 - Fullscreen renderer mode now works in Chrome 71
 - Account sign up now works when guest access is disabled
 - Navigating in and out of exercise detail views is fixed
 - Misleading exam submission modal text is now more accurate
 - Browsing content tree in exam creation is now faster
 - Unavailable content in coach reports is now viewable
 - Content import errors are handled better
 - Added command to restore availability of content after bad upgrade

Internationalization and localization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 - Added Fufulde Mboroore

See a `full list <https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.11.1>`__ of changes on Github

0.11.0
------

Added
~~~~~

 - Support for EPUB-format electronic books
 - Upgrades to exam and lesson creation, including search functionality and auto-save
 - New error handling and reporting functionality
 - Channel import from custom network locations
 - Setting for enabling or disabling guest access
 - Basic commands to help with GDPR compliance
 - Privacy information to help users and admins understand how their data is stored

Changed or fixed
~~~~~~~~~~~~~~~~

 - Improvements to rendering of some pages on smaller screens
 - Improvements to search behavior in filtering and handling of large result sets
 - Improvements to the setup wizard based on user feedback and testing
 - Improvements to user management, particularly for admins and super admins
 - Fix: Allow usernames in non-latin alphabets
 - Fix: Drive listing and space availability reporting
 - Auto-refresh in coach reports
 - Added more validation to help with log-in
 - Security: upgraded Python cryptography and pyopenssl libraries for CVE-2018-10903

Internationalization and localization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 - Languages: English, Arabic, Bengali, Bulgarian, Chinyanja, Farsi, French, Hindi, Marathi, Portuguese (Brazilian), Spanish, Swahili, Telugu, Urdu, Vietnamese, and Yoruba
 - Improved consistency of language across the application, and renamed "Superuser" to "Super admin"
 - Many fixes to translation and localization
 - Consistent font rendering across all languages

See a `full list <https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.11.0>`__ of changes on Github


0.10.3
------

Internationalization and localization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 - Added Mexican Spanish (es_MX) and Bulgarian (bg)

Fixed
~~~~~

 - Upgrade issue upon username conflict between device owner and facility user
 - Channel import listing of USB devices when non-US locale
 - Counts for coach-specific content would in some cases be wrongly displayed

See a `more detailed list <https://github.com/learningequality/kolibri/pulls?q=is%3Apr+milestone%3A0.10.3+label%3Achangelog>`_ of changes on Github


0.10.2
------

 - Performance improvements and bug fixes for content import
 - Exam creation optimizations

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.10.2>`__ of changes on Github


0.10.1
------

 - Bug fix release
 - Several smaller UI fixes
 - Fixes for SSL issues on low-spec devices / unstable connectivity
 - Compatibility fixes for older system libraries

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.10.1>`__ of changes on Github


0.10.0
------

 - Support for coach-specific content
 - Content import/export is more reliable and easier to use
 - Search has improved results and handles duplicate items
 - Display of answer history in learner exercises is improved
 - Login page is more responsive
 - Windows-specific improvements and bug fixes
 - New Kolibri configuration file
 - Overall improved performance
 - Auto-play videos
 - Various improvements to PDF renderer
 - Command to migrate content directory location
 - Languages: English, Arabic, Bengali, Chinyanja, Farsi, French, Hindi, Kannada, Marathi, Burmese, Portuguese (Brazilian), Spanish, Swahili, Tamil, Telugu, Urdu, Yoruba, and Zulu

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=milestone%3A0.10.0+label%3Achangelog>`__ of changes on Github.


0.9.3
-----

 - Compressed database upload
 - Various bug fixes

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=milestone%3A0.9.3+label%3Achangelog>`__ of changes on Github.


0.9.2
-----

 - Various bug fixes
 - Languages: English, Arabic, Bengali, Chinyanja, Farsi, French, Hindi, Marathi, Portuguese (Brazilian), Spanish, Swahili, Tamil, Telugu, Urdu, Yoruba, and Zulu

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=milestone%3A0.9.2+label%3Achangelog>`__ of changes on Github.


0.9.1
-----

 - Fixed regression that caused very slow imports of large channels
 - Adds new 'import users' command to the command-line
 - Various consistency and layout updates
 - Exercises with an error no longer count as 'correct'
 - Fixed issue with password-less sign-on
 - Fixed issue with editing lessons
 - Various other fixes
 - Languages: English, Arabic, Chinyanja, Farsi, French, Hindi, Marathi, Portuguese (Brazilian), Spanish, Swahili, Tamil, Telugu, and Urdu

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=milestone%3A0.9.1+label%3Achangelog>`__ of changes on Github.


0.9.0
-----

 - Consistent usage of 'coach' terminology
 - Added class-scoped coaches
 - Support for multi-facility selection on login
 - Cross-channel exams
 - Show correct and submitted answers in exam reports
 - Added learner exam reports
 - Various bug fixes in exam creation and reports
 - Various bug fixes in coach reports
 - Fixed logging on Windows
 - Added ability for coaches to make copies of exams
 - Added icon next to language-switching functionality
 - Languages: English, Arabic, Farsi, French, Hindi, Spanish, Swahili, and Urdu

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=milestone%3A0.9.0+label%3Achangelog>`__ of changes on Github.


0.8.0
-----

 - Added support for assigning content using 'Lessons'
 - Updated default landing pages in Learn and Coach
 - Added 'change password' functionality to 'Profile' page
 - Updates to text consistency
 - Languages: English, Spanish, Arabic, Farsi, Urdu, French, Haitian Creole, and Burmese
 - Various bug fixes

See a `more detailed list <https://github.com/learningequality/kolibri/issues?q=milestone%3A0.8.0+label%3Achangelog>`__ of changes on Github.


0.7.2
-----

 - Fix issue with importing large channels on Windows
 - Fix issue that prevented importing topic thumbnail files

0.7.1
-----

 - Improvements and fixes to installers including Windows & Debian
 - Updated documentation


0.7.0
-----

 - Completed RTL language support
 - Languages: English, Spanish, Arabic, Farsi, Swahili, Urdu, and French
 - Support for Python 3.6
 - Split user and developer documentation
 - Improved lost-connection and session timeout handling
 - Added 'device info' administrator page
 - Content search integration with Studio
 - Granular content import and export


0.6.2
-----

 - Consistent ordering of channels in learner views


0.6.1
-----

 - Many mobile-friendly updates across the app
 - Update French, Portuguese, and Swahili translations
 - Upgraded Windows installer


0.6.0
-----

 - Cross-channel searching and browsing
 - Improved device onboarding experience
 - Improved device permissions experience (deprecated 'device owner', added 'superuser' flag and import permission)
 - Various channel import/export experience and stability improvements
 - Responsive login page
 - Dynamic language switching
 - Work on integrated living style guide
 - Added beta support for right-to-left languages
 - Improved handling of locale codes
 - Added support for frontend translation outside of Vue components
 - Added an open-source 'code of conduct' for contributors
 - By default run PEX file in foreground on MacOS
 - Crypto optimizations from C extensions
 - Deprecated support for HTML in translation strings
 - Hide thumbnails from content 'download' button
 - Automatic database backup during upgrades. #2365
 - ... and many other updates and fixes


0.5.3
-----

 - Release timeout bug fix from 0.4.8


0.5.2
-----

 - Release bug fix from 0.4.7


0.5.1
-----

 - Python dependencies: Only bundle, do not install dependencies in system env #2299
 - Beta Android support
 - Fix 'importchannel' command #2082
 - Small translation improvements for Spanish, French, Hindi, and Swahili


0.5.0
-----

 - Update all user logging related timestamps to a custom datetime field that includes timezone info
 - Added daemon mode (system service) to run ``kolibri start`` in background (default!) #1548
 - Implemented ``kolibri stop`` and ``kolibri status`` #1548
 - Newly imported channels are given a 'last_updated' timestamp
 - Add progress annotation for topics, lazily loaded to increase page load performance
 - Add API endpoint for getting number and total size of files in a channel
 - Migrate all JS linting to prettier rather than eslint
 - Merge audio_mp3_render and video_mp4_render plugins into one single media_player plugin
 - KOLIBRI_LISTEN_PORT environment variable for specifying a default for the --port option #1724


0.4.9
-----
  - User experience improvements for session timeout


0.4.8
-----

 - Prevent session timeout if user is still active
 - Fix exam completion timestamp bug
 - Prevent exercise attempt logging crosstalk bug
 - Update Hindi translations

0.4.7
-----

 - Fix bug that made updating existing Django models from the frontend impossible


0.4.6
-----

 - Fix various exam and progress tracking issues
 - Add automatic sign-out when browser is closed
 - Fix search issue
 - Learner UI updates
 - Updated Hindi translations


0.4.5
-----

 - Frontend and backend changes to increase performance of the Kolibri application under heavy load
 - Fix bug in frontend simplified login code


0.4.4
-----

 - Fix for Python 3 compatibility in Whl, Windows and Pex builds #1797
 - Adds Mexican Spanish as an interface language
 - Upgrades django-q for bug fixes


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


0.4.0
-----

 - Class and group management
 - Learner reports #1464
 - Performance optimizations #1499
 - Anonymous exercises fixed #1466
 - Integrated Morango, to prep for data syncing (will require fresh database)
 - Adds Simplified Login support as a configurable facility flag


0.3.3
-----

 - Turns video captions on by default


0.3.2
-----

 - Updated translations for Portuguese and Kiswahili in exercises.
 - Updated Spanish translations


0.3.1
-----

 - Portuguese and Kaswihili updates
 - Windows fixes (mimetypes and modified time)
 - VF sidebar translations


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
