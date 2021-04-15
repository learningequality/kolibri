# Release Notes

List of the most important changes for each release.

## 0.14.7

### Internationalization and localization

- Updated localizations

### Fixed
- #7766 Content imported by administrators was not immediately available for learners to use
- #7869 Unlisted channels would not appear in list in channel import-workflow after providing token
- #7810 Learners' new passwords were not being validated on the Sign-In page
- #7764 Users' progress on resources was not being properly logged, making it difficult to complete them
- #8003, #8004, #8010 Sign-ins could cause the server to crash if database was locked
- #8003, #7947 Issues downloading CSV files on Windows

### Changed

- #7735 Filtering on lists of users returns ranked and approximate matches
- #7733 Resetting a facility's settings respects the preset (e.g. formal, informal, nonformal) chosen for it during setup
- #7823 Improved performance on coach pages for facilities with large numbers of classrooms and groups

([0.14.7 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.14.7))

## 0.14.6

### Fixed

- #7725 On Firefox, text in Khmer, Hindi, Marathi, and other languages did not render properly.
- #7722, #7488 After viewing a restricted page, then signing in, users were not redirected back to the restricted page.
- #7597, #7612 Quiz creation workflow did not properly validate the number of questions

([0.14.6 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.14.6))

## 0.14.5

(Note: 0.14.4 contained a critical issue and was superseded by 0.14.5)

### Changed

- File downloads now run concurrently, taking better advantage of a device's bandwidth and reducing the time needed to import resources from Kolibri Studio or other content sources
- When setting up a new device using the [Setup Wizard's "Quick Start" option](https://kolibri.readthedocs.io/en/latest/install/initial_setup.html#quick-start), the ["Allow learners to create accounts" setting](https://kolibri.readthedocs.io/en/latest/install/initial_setup.html#quick-start) is enabled by default.
- The `provisiondevice` management command no longer converts the user-provided facility name to all lower-case
- Markdown descriptions for resources now preserve line breaks from the original source

### Fixed

- Multiple bugs when creating, editing, and copying quizzes/lessons
- Multiple bugs when navigating throughout the Coach page
- Multiple bugs specific to Kolibri servers using PostgreSQL
- On Safari, sections of the Facility > Data page would disappear unexpectedly after syncing a facility
- On IE11, it was not possible to setup a new device by importing a facility
- Missing thumbnails on resource cards when searching/browsing in channels
- Numerous visual and accessibility issues
- Facilities could not be renamed if the only changes were to the casing of the name (e.g. changing "Facility" to "FACILITY")

([0.14.5 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.14.5))

## 0.14.3

(Note: 0.14.0-2 contained regressions and were superseded by 0.14.3)

### Fixed

- Some links were opening in new browser windows

([0.14.3 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.14.3))

## 0.14.2

### Fixed

- Prevent SQL checksum related too many variables errors

([0.14.2 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.14.2))

## 0.14.1

### Changed

- Responsive layout for channel cards of Learn Page changed to use horizontal space more efficiently

### Fixed

- Resources could not be removed from lessons
- Inaccurate information on Device > Info page when using Debian installer

([0.14.1 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.14.1))

## 0.14.0

### Internationalization and localization

- Added German
- Added Khmer
- CSV data files have localized headers and filenames

### Added

- In the Setup Wizard, users can import an existing facility from peer Kolibri devices on the network
- Facility admins can sync facility data with peer Kolibri devices on the network or Kolibri Data Portal
- Facility admins can import and export user accounts to and from a CSV file
- Channels can display a learner-facing "tagline" on Learn channel list
- Device and facility names can now be edited by admins
- Super admins can delete facilities from a device
- Quizzes and lessons can be assigned to individual learners in addition to whole groups or classes
- Super admins can view the Facility and Coach pages for all facilities
- Pingbacks to the telemetry server can now be disabled

### Changed

- New card layout for channels on Learn Page is more efficient and displays new taglines
- Simplified setup process when using Kolibri for personal use
- Improved sign-in flow, especially for devices with multiple facilities
- The experience for upgrading channels has been improved with resource highlighting, improved statistics, and more efficient navigation
- Improved icons for facilities, classrooms, quizzes, and other items
- More consistent wording of notifications in the application
- Quizzes and lessons with missing resources are more gracefully handled
- Shut-down times are faster and more consistent

### Fixed

- Many visual and user experience issues
- Language filter not working when viewing channels for import/export
- A variety of mobile responsiveness issues have been addressed


([0.14.0 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.14.0))

## 0.13.3

### Changed or fixed

- Fixed: Infinite-loop bug when logging into Kolibri through Internet In A Box (IIAB)
- Fixed: Performance issues and timeouts when viewing large lists of users on the Facility page
- Fixed: Startup errors when Kolibri is installed via `pip` on non-debian-based Linux distributions

### Internationalization and localization

- Added Simplified Chinese

([0.13.3 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.13.3))

## 0.13.2

### Changed or fixed

- Fixed: In the Device Page, multiple bugs related to managing channels.
- Fixed: Problems viewing African Storybook content on iPads running iOS 9.

### Internationalization and localization

- Added Italian

([0.13.2 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.13.2))

## 0.13.1

### Added

- Python version is shown on the 'Device > Info' page in the 'Advanced' section
- Improved help information when running `kolibri --help` on the command line


### Changed or fixed

- Various layout and UX issues, especially some specific to IE11 and Firefox
- 'Device > Info' page not accessible when logged in as a superuser
- Channels unintentionally reordered on ‘Device > Channels’ when new content is imported
- Video captions flashing in different languages when first opening a video
- Changes to channels updated and republished in Studio not being immediately reflected in Kolibri
- Occasional database blocking errors when importing large collections of content from external drives
- Occasional database corruption due to connections not being closed after operations
- Automatic data restoration for corrupted databases
- Recreate cache.db files when starting the Kolibri server to remove database locks that may not have been cleanly removed in case of an abrupt shut-down.

([0.13.1 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.13.1))


## 0.13.0

### Added

- Improved content management
  - Queues and task manager
  - Granular deletion
  - Improved channel updating
  - Disk usage reporting improvements
  - Auto-discovery of local Kolibri peers
- Demographics collection and reporting
- MacOS app
- High-performance Kolibri Server package for Debian
- Pre-built Raspberry Pi Kolibri image
- Video transcripts
- Downloadable and printable coach reports
- New device settings
- "Skip to content" keyboard link


### Changed or fixed

- Preserve 'unlisted' status on channels imported from token
- Allow duplicate channel resources to be maintained independently
- Auto-refresh learner assignemnt view
- Unclean shutdowns on very large databases, due to prolonged database cleanup
- Facility admin performance improvements
- Jittering modal scrollbars
- Updated side-bar styling
- Improved form validation behavior
- Improved learner quiz view
- Improved keyboard accessibility

([0.13.0 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.13.0))


## 0.12.9

### Added

- Improved error reporting in Windows

### Changed or fixed

- Database vacuum now works correctly
- Fixes related to network detection
- Improve performance of classroom API endpoint to prevent request timeouts

### Internationalization and localization

- Added Korean

([0.12.9 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.9))

## 0.12.8

### Changed or fixed

- Fixed: users creating accounts for themselves not being placed in their selected facility
- Fixed: images in Khan Academy exercises not appearing on occasion
- Fixed: "Usage and Privacy" modal not closing when clicking the "Close" button

([0.12.8 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.8))

## 0.12.7

(Note: 0.12.6 contained a regression and was superseded by 0.12.7)

### Changed or fixed

- Facility user table is now paginated to improve performance for facilities with large numbers of users.
- Various usability and visual improvements, including improved layout when using a RTL language
- On Windows, `kolibri.exe` is automatically added to the path in the command prompt
- Improved system clean-up when uninstalling on Windows


### Internationalization and localization

- Added Latin American Spanish (ES-419)

([0.12.7 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.7))

([0.12.6 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.6))

## 0.12.5

- Upgraded Morango to 0.4.6, fixing startup errors for some users.

([0.12.5 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.5))

## 0.12.4

### Added

- Device Settings Page - The default language can now be changed under Device > Settings. This is the language that will be used on browsers that have never opened Kolibri before (but can be changed after opening Kolibri using the language selector).
- Coach Reports - Users can preview quizzes and lessons and edit their details from their associated report, without having to go to the "Plan" sub-page.
- Added a `kolibri manage deleteuser` command to remove a user from a server, as well as all other servers synchronized with it.
- Added a new theming system for customizing various colors that appear in Kolibri.

### Changed or fixed

- EPUB documents with large tables are displayed in a single-column, scrollable format to improve their readability.
- EPUB viewer now saves font and theme settings between sessions.
- Quiz creation workflow only places unique questions in a quiz, removing duplicates that may appear in a topic tree.
- Title and name headers are consistently accompanied by icons in Kolibri symbol system to help orient the user.


([0.12.4 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.4))

## 0.12.3

### Changed or fixed


- Improved handling of partially-download or otherwise corrupted content databases
- Fixed regression where users could not change their passwords in the Profile page
- Improved PostgreSQL support
- Added fixes related to coach tools

([0.12.3 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.3))


## 0.12.2

### Added

- Coaches can edit lessons from the Coach > Reports page
- Coaches can preview and edit quiz details from the Coach > Reports and Plan pages

### Changed or fixed

- Coaches can edit quiz and lesson details and statuses in the same user interface


## 0.12.2

### Added

- Dynamic selection for CherryPy thread count based on available server memory


### Changed or fixed

- Alignment of coach report icons when viewed in right-to-left languages corrected
- Fixes to loading of some HTML5 apps
- Lessons are now correctly scoped to their classes for learners


### Internationalization and localization

- Added Gujarati
- Fixed missing translations in coach group management

([0.12.2 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.2))


## 0.12.1

### Added

- Initial support for uwsgi serving mode.


### Changed or fixed

- Fixed 0.12.0 regression in HTML5 rendering that affected African Storybooks and some other HTML5 content.
- Fixed 0.12.0 regression that prevented some pages from loading properly on older versions of Safari/iOS.


### Internationalization and localization

- Added Burmese

([0.12.1 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.1))


## 0.12.0

### Added

- Coach Dashboard - added regularly updating notifications and new information architecture for the coach interface, to provide actionable feedback for coaches about learner progress
- New capability for sandboxed HTML5 app content to utilize sessionStorage, localStorage and cookies, with the latter two restored between user sessions
- Support for enrolling learners in multiple groups in a class
- Management command to reorder channels to provide more customized display in learn


### Changed or fixed

- Exams are now known as Quizzes
- Quizzes with content from deleted channels will now show an error message when a learner or coach is viewing the problems in the quiz or quiz report
- Lessons with content from deleted channels will have those contents automatically removed. If you have created lessons with deleted content prior to 0.12, learner playlists and coach reports for those lessons will be broken. To fix the lesson, simply view it as a coach under Coach > Plan, and it will be fixed and updated automatically
- Changes the sub-navigation to a Material Design tabs-like experience
- Make facility log exporting a background process for a better user experience when downloading large logs
- Allow appbar to move off screen when scrolling on mobile, to increase screen real estate
- Kolibri now supports for iOS Safari 9.3+
- Validation is now done in the 'provisiondevice' command for the username of the super admin user being created
- Disable import and export buttons while a channel is being downloaded to prevent accidental clicks
- Prevent quizzes and lessons in the same class from being created with the same name
- Update quiz and lesson progress for learners without refreshing the page
- Improved focus rings for keyboard navigation
- Coach content no longer appears in recommendations for non-coach users
- The Kolibri loading animation is now beautiful, and much quicker to load
- Icons and tables are now more standardized across Kolibri, to give a more consistent user experience
- Enable two high contrast themes for EPUB rendering for better accessibility
- Supports accessing Kolibri through uwsgi


### Internationalization and localization

- Languages: English, Arabic, Bengali, Bulgarian, Chinyanja, Farsi, French, Fulfulde Mbororoore, Hindi, Marathi, Portuguese (Brazilian), Spanish, Swahili, Telugu, Urdu, Vietnamese, and Yoruba

([0.12.0 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.12.0))


## 0.11.1

### Added

- Support for RTL EPubs
- Support for Python 3.7

### Changed or fixed

- Fullscreen renderer mode now works in Chrome 71
- Account sign up now works when guest access is disabled
- Navigating in and out of exercise detail views is fixed
- Misleading exam submission modal text is now more accurate
- Browsing content tree in exam creation is now faster
- Unavailable content in coach reports is now viewable
- Content import errors are handled better
- Added command to restore availability of content after bad upgrade

### Internationalization and localization

- Added Fufulde Mboroore

([0.11.1 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.11.1))

## 0.11.0

### Added

- Support for EPUB-format electronic books
- Upgrades to exam and lesson creation, including search functionality and auto-save
- New error handling and reporting functionality
- Channel import from custom network locations
- Setting for enabling or disabling guest access
- Basic commands to help with GDPR compliance
- Privacy information to help users and admins understand how their data is stored

### Changed or fixed

- Improvements to rendering of some pages on smaller screens
- Improvements to search behavior in filtering and handling of large result sets
- Improvements to the setup wizard based on user feedback and testing
- Improvements to user management, particularly for admins and super admins
- Fix: Allow usernames in non-latin alphabets
- Fix: Drive listing and space availability reporting
- Auto-refresh in coach reports
- Added more validation to help with log-in
- Security: upgraded Python cryptography and pyopenssl libraries for CVE-2018-10903

### Internationalization and localization

- Languages: English, Arabic, Bengali, Bulgarian, Chinyanja, Farsi, French, Hindi, Marathi, Portuguese (Brazilian), Spanish, Swahili, Telugu, Urdu, Vietnamese, and Yoruba
- Improved consistency of language across the application, and renamed "Superuser" to "Super admin"
- Many fixes to translation and localization
- Consistent font rendering across all languages

([0.11.0 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.11.0))


## 0.10.3

### Internationalization and localization

- Added Mexican Spanish (es_MX) and Bulgarian (bg)

### Fixed

- Upgrade issue upon username conflict between device owner and facility user
- Channel import listing of USB devices when non-US locale
- Counts for coach-specific content would in some cases be wrongly displayed

([0.10.3 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.10.3))

## 0.10.2

- Performance improvements and bug fixes for content import
- Exam creation optimizations

([0.10.2 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.10.2))

## 0.10.1

- Bug fix release
- Several smaller UI fixes
- Fixes for SSL issues on low-spec devices / unstable connectivity
- Compatibility fixes for older system libraries

([0.10.1 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.10.1))

## 0.10.0

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

([0.10.0 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.10.0))

0.9.3
-----

- Compressed database upload
- Various bug fixes

([0.9.3 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.9.3))

0.9.2
-----

- Various bug fixes
- Languages: English, Arabic, Bengali, Chinyanja, Farsi, French, Hindi, Marathi, Portuguese (Brazilian), Spanish, Swahili, Tamil, Telugu, Urdu, Yoruba, and Zulu

([0.9.2 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.9.2))

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

([0.9.1 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.9.1))

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

([0.9.0 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.9.0))

0.8.0
-----

- Added support for assigning content using 'Lessons'
- Updated default landing pages in Learn and Coach
- Added 'change password' functionality to 'Profile' page
- Updates to text consistency
- Languages: English, Spanish, Arabic, Farsi, Urdu, French, Haitian Creole, and Burmese
- Various bug fixes

([0.8.0 Github milestone](https://github.com/learningequality/kolibri/issues?q=label%3Achangelog+milestone%3A0.8.0))

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


## 0.1.0 - MVP

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


## 0.0.1 - MMVP

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
