# Release Notes

List of the most important changes for each release.

## 0.18.0

### High level overview
Release 0.18.0 introduces improvements and new features in the **Coach** experience to make it easier to find materials when creating a lesson or quiz.

### Added
**New Feature: Coaches can now use metadata filtering when creating lessons and quizzes**

Updates to lessons and quizzes help coaches find what they need faster. Coaches can use filters like **activity type** (video, audio, reading materials), **language**, **level**, **category** (school subjects, vocational materials), and more. By combining a variety of filters, coaches can quickly locate specific and relevant materials they need.

**Additional new workflows**
- The navigation in coach is updated and simplified. Pages are now organized around "Lessons" and "Quizzes", rather than "Reports" and "Plan", making it easier to quickly find the relevant lesson and quiz pages. Some pages also have additional information and interactions added.
- Coaches have updated quiz creation options. They can choose to have Kolibri create a quiz for them from selected exercises, or they can choose specific questions from their available resources.
- Bloom player is now supported in Kolibri.
- Coaches can choose when to make quiz reports available to learners.

Noteworthy technical updates include rearchitecting our Coach plugin pages to support the navigation updates, extending the routing structure in coach to use nested routes and a side-panel style UX in lessons, and upgrading KDS to provide a variety of bug fixes and introduce the new `KCard` component.


<details>
  <summary>List of supporting PRs</summary>

- 0.18: Groups view updates by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12696
- 0.18: Plan Quizzes view updates by @ozer550 in https://github.com/learningequality/kolibri/pull/12704
- Add checks for exam groups and learner_ids to fix empty quiz page display by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/13264
- Add individual learners as recipient type in quiz report by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13100
- Add questions auto replacement feature by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13230
- Add searchFiltersPanel to Lessons by @ozer550 in https://github.com/learningequality/kolibri/pull/12871
- Add learner_needs field to contentnode API by @rtibbles in https://github.com/learningequality/kolibri/pull/12763
- Add warning banner for "insufficient resources" by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13146
- Adds ability to preview non-practice resources from the sidepanel by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13012
- Adds ability to preview selected exercise by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13032
- Adds temporary routes for lesson creation and edits by @ozer550 in https://github.com/learningequality/kolibri/pull/12672
- Avoid displaying CoachClassListPage until after data is finished loading by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12951
- Basic layout for displaying "resources currently in lesson" by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12845
- Add quiz recipients selector as Side Panel by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12952
- Add quiz report visibility control for coaches by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/13064
- Add searchAndFilterStrings translator into kolibri-common by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12623
- Category search modal icon update by @marcellamaki in https://github.com/learningequality/kolibri/pull/13092
- Clean up resource preview for practice quiz selection by @rtibbles in https://github.com/learningequality/kolibri/pull/13283
- Coach main navigation refactor by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12775
- Conditionalize empty message string in lesson and quiz tables by @marcellamaki in https://github.com/learningequality/kolibri/pull/13256
- Conditionalize Save & Finish button by @marcellamaki in https://github.com/learningequality/kolibri/pull/13241
- ContentCardList: Fix ultrawide radio buttons by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13221
- Copies & renames useSearch to useBaseSearch in kolibri-common package (On develop this time) by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12566
- Create skeleton page for question selection shopping cart workflow by @ozer550 in https://github.com/learningequality/kolibri/pull/13049
- Disable all ungrouped learners checkbox when there are no ungrouped leaners by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13224
- Drag widget and lesson cleanup by @rtibbles in https://github.com/learningequality/kolibri/pull/13297
- Ensure quiz report visibility is updated correctly after a quiz has been closed by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/13164
- Exam Page: Move smaller screen timer to top by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12485
- Extracts QuestionsAccordion component by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13026
- Fix 'computed property already' defined on the lesson summary page in Coach by @MisRob in https://github.com/learningequality/kolibri/pull/13126
- Fix 'New quiz' button is visible in the print report by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12945
- Fix "Invalid prop" error by @MisRob in https://github.com/learningequality/kolibri/pull/13125
- Fix accesibility issues by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13246
- Fix alignment of language buttons in setup flow by @malviya-rajveer in https://github.com/learningequality/kolibri/pull/13024
- Fix broken CSV export features in COACH tabs by @ozer550 in https://github.com/learningequality/kolibri/pull/12919
- Fix bugs in common CategorySearchModal by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13056
- Fix Coach > Quizzes blank page after copying a quiz by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12941
- Fix coach quizzes blank page by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12940
- Fix colors of list items in quiz preview by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12920
- fix conditional for channels in useCoachMetatdataTags by @rtibbles in https://github.com/learningequality/kolibri/pull/13214
- Fix creating a quiz without having imported resources or users enrolled in the class by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12739
- Fix filters in csv exports for Lessons page by @ozer550 in https://github.com/learningequality/kolibri/pull/12949
- Fix glitch in completed quiz report sections displaying incorrect values by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/13220
- Fix question count reset when isChoosingManually changed by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13263
- Fix redirection issues in coach resource selection side panels by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13223
- Fix regression with category icons overlapping text by @marcellamaki in https://github.com/learningequality/kolibri/pull/13156
- fix repetitive strings for drag and drop aria labels by @marcellamaki in https://github.com/learningequality/kolibri/pull/13296
- Fix search in quiz workflows by @rtibbles in https://github.com/learningequality/kolibri/pull/13234
- Fix: Show search & setting buttons at channel level in quiz resource selection by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13198
- Fixes Coach > Lessons - 'Recipients' drop-down not working by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12911
- Fixes filters not displayed on the imported exercises from QA channel by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12935
- fixes workskills string not being available in the commoncorestrings by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13135
- Helper function(s) to manage display of metadata tags in the new cards by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12686
- Hide the 'Search' button when there's nothing to search for by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13277
- Implement manual questions selection workflow by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13091
- Implement new questions replacement by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13180
- Implement quiz resources selection switching mode by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13123
- Information Architecture Refactor: Update the Plan > Lesson Summary by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12730
- Initial implementation of the Resource management side panel by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12857
- Integrate search resource selection by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13008
- Integrate shopping cart into lesson resource selection side panel by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12996
- Integrate the "useSearch" composable and search filters panel into the results list in quizzes by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13083
- LearnerSummaryPage: Fix quiz/lesson report links by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13037
- Lesson resources selection by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12895
- Lesson Summary children routes refactor by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12852
- LessonResourceSelection: Add margin to bottom controls when isAppContext & touch device by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13215
- Manage title truncation across quiz and lesson side panel workflows by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/13235
- Manual selection workflow by @ozer550 in https://github.com/learningequality/kolibri/pull/13089
- Migrate quizzes to updated resource selection by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13043
- Move SearchFiltersPanel into kolibri-common by @jredrejo in https://github.com/learningequality/kolibri/pull/12669
- Move useChannels & SearchChips to kolibri-common by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12745
- No redirect resource preview by @marcellamaki in https://github.com/learningequality/kolibri/pull/13166
- Update SearchFiltersPanel for Coach by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12759
- Update strings and message files. by @rtibbles in https://github.com/learningequality/kolibri/pull/13304
- Update strings and references after UX writing review by @marcellamaki in https://github.com/learningequality/kolibri/pull/13289
- Update the Plans > Lessons landing page to match the new information architecture by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12713
- Update preview plan quiz by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12685
- Update question settings back navigation by @marcellamaki in https://github.com/learningequality/kolibri/pull/13169
- Update UI and add additional info to Learner Reports pages by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12711
- Use Accessible Cards in Lesson Resource Selection by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13060
- Visual fixes on the 'Create new lesson' page by @MisRob in https://github.com/learningequality/kolibri/pull/13133

</details>


Other technical additions include adding file storage option, allowing plugins to be enabled/disabled/applied via env vars, allowing studio URLs to be created as network locations, and the implementation of a task polling composable.
<details>
  <summary>List of key PRs</summary>

- Add file storage option by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12590
- Allow plugins to be enabled, disabled, and applied via env vars. by @rtibbles in https://github.com/learningequality/kolibri/pull/12844
- Allow Studio URLs to be created as network locations by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13044
- Implement task polling composable by @ozer550 in https://github.com/learningequality/kolibri/pull/13158


</details>

### Changed

**Kolibri JS Public API - BREAKING CHANGES**
- **BREAKING CHANGE** - Large parts of the JS Public API have now been removed. For a complete specification of the current public API see the kolibri npm package.
- **BREAKING CHANGE** - Only the TaskResource is now available as a public resource within the JS API. All other API endpoints, aside from those namespaced as 'public' are considered internal and using them is not supported.
- All previously public code has either been deleted, or is in the unpublished kolibri-common package in the repository. If you need to continue using any of this code, it is recommended to vendor and modify.


<details>
  <summary>List of key PRs related to public API and refactoring </summary>

- Consolidate content node utilities into kolibri-common. by @rtibbles in https://github.com/learningequality/kolibri/pull/12699
- Fix import path error in kolibri-tools migrate core API functionality by @rtibbles in https://github.com/learningequality/kolibri/pull/13031
- JS Public API Update by @rtibbles in https://github.com/learningequality/kolibri/pull/12722
- Add pre-commit hook to prevent references to kolibri-common package in published packages by @rtibbles in https://github.com/learningequality/kolibri/pull/12891
- Move core channel state into coach - the only place it is still used. by @rtibbles in https://github.com/learningequality/kolibri/pull/12574
- Move core module registration out of the core store module. by @rtibbles in https://github.com/learningequality/kolibri/pull/12573
- Move language object sorting and comparison utilities into core i18n module by @rtibbles in https://github.com/learningequality/kolibri/pull/12602
- Move navroute generation into usenav composable. by @rtibbles in https://github.com/learningequality/kolibri/pull/12701
- Move renderer suffix into core constants. by @rtibbles in https://github.com/learningequality/kolibri/pull/12700
- Moved core notifications handling into NotificationsRoot component by @iamshobhraj in https://github.com/learningequality/kolibri/pull/12644
- Remove unneeded TotalPoints component from core API. by @rtibbles in https://github.com/learningequality/kolibri/pull/12600
- Remove CoreSnackbar from core API. by @rtibbles in https://github.com/learningequality/kolibri/pull/12627
- Use webpack's built in dynamic public path setting by @rtibbles in https://github.com/learningequality/kolibri/pull/12848

</details>



Other important technical updates include:
- upgrading to Vue 2.7
- Python 3.13
- making linting a standalone package

<details>
  <summary>Other changes include: </summary>
  - Don't allow any learn subnavigation if the user isn't logged in. by @rtibbles in https://github.com/learningequality/kolibri/pull/13287
  - Pin python version to 3.11 for node-gyp support. by @rtibbles in https://github.com/learningequality/kolibri/pull/12984
  - Update pre-commit for python 3.12 by @jredrejo in https://github.com/learningequality/kolibri/pull/12677
  - Upgrade dependencies and test matrix for Python 3.13. by @rtibbles in https://github.com/learningequality/kolibri/pull/12746
  - Upgrade kds v5.0.0 by @marcellamaki in https://github.com/learningequality/kolibri/pull/13098
  - Upgrade to vue2.7 and remove @vue/composition-api. by @rtibbles in https://github.com/learningequality/kolibri/pull/12933
  - Use explicit Python version to suppress warning by @rtibbles in https://github.com/learningequality/kolibri/pull/12802

</details>


### Fixed

#### Content renderer updates and fixes

<details>
  <summary>List of supporting PRs</summary>

  - Auto update h5p by @rtibbles in https://github.com/learningequality/kolibri/pull/12806
  - Bloom player by @nikkuAg in https://github.com/learningequality/kolibri/pull/12586
  - Fix various bugs in the Bloom Player implementation by @rtibbles in https://github.com/learningequality/kolibri/pull/12752
  - Update Bloom player assets with improved navigation button opacity by @GautamBytes in https://github.com/learningequality/kolibri/pull/13063
  - Don't use 'auto' public paths to resolve resources. by @rtibbles in https://github.com/learningequality/kolibri/pull/12942
  com/learningequality/kolibri/pull/13137
  - Fix H5P update builds by @rtibbles in https://github.com/learningequality/kolibri/pull/12977
  - Fix H5P resources not showing completion when all questions answered correctly by @rtibbles in https://github.
  - Add blob: to CSP_SCRIPT_SRC to allow perseus graphie rendering. by @rtibbles in https://github.com/learningequality/kolibri/pull/13136
  - Update H5P to latest by @rtibbles in https://github.com/learningequality/kolibri/pull/12993
</details>

#### Miscellaneous small improvements and fixes

<details>
  <summary>List of supporting PRs</summary>

- Add a placeholder string when no resources are available/no channels on devices by @marcellamaki in https://github.com/learningequality/kolibri/pull/13041
- Add optional padding argument to logo tool by @rtibbles in https://github.com/learningequality/kolibri/pull/12409
- Add ordering for FacilityUser viewset by @ozer550 in https://github.com/learningequality/kolibri/pull/12324
- Add powershell fallback for windows disk information. by @rtibbles in https://github.com/learningequality/kolibri/pull/13186
- Add score in practice quiz by @thesujai in https://github.com/learningequality/kolibri/pull/12564
- Add side panel title margins for consistency and spacing by @LianaHarris360 in https://github.com/
- Add tests for useQuizResources and update functionality for annotation and loading states by @GautamBytes in https://github.com/learningequality/kolibri/pull/13080
- Add to heartbeat API to keep useConnection composable more tightly encapsulated in the heartbeat module. by @rtibbles in https://github.com/learningequality/kolibri/pull/12698
- Add unstarted quiz string to quiz reports for learners who haven't started a quiz by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/13112
- Annotate channels with some ordered metadata by @jredrejo in https://github.com/learningequality/kolibri/pull/12944
- Clean up of unneeded Python translated strings. by @rtibbles in https://github.com/learningequality/kolibri/pull/13293
- Clean up outdated references to NodeJS versions less than 18.20 by @rtibbles in https://github.com/learningequality/kolibri/pull/13245
- Clean up unnecessarily verbose strings in favour of $formatRelative. by @rtibbles in https://github.com/learningequality/kolibri/pull/13294
- Consistent 400 Response for Invalid Input in Kolibri Public Content APIs by @manzil-infinity180 in https://github.com/learningequality/kolibri/pull/12818
- Consolidate list remote users api by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12321
- Creating composable for connection monitoring and replacing existing logic with it by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12584
- Creating useTotalProgress composable and migrating code to use it by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12621
- Delete unused mappers module. by @rtibbles in https://github.com/learningequality/kolibri/pull/13268
- Don't use reactive on an array. by @rtibbles in https://github.com/learningequality/kolibri/pull/13140
- Drop and recreate M2M field to avoid constraint errors. by @rtibbles in https://github.com/learningequality/kolibri/pull/12957
- Ensure session and summary log outputs are consistent between channel and displayed node by @rtibbles in https://github.com/learningequality/kolibri/pull/12804
- Fix change facility workflow by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13165
- fix construction of cookie using user supplied input #12808 by @KumarVivekPathak in https://github.com/learningequality/kolibri/pull/13029
- Fix incorrect validator. by @rtibbles in https://github.com/learningequality/kolibri/pull/13160
- Fix infinite load more by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13185
- Fix lesson resource selection issues by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13085
- Fix linting on develop. by @rtibbles in https://github.com/learningequality/kolibri/pull/12598
- Fix masterylog end timestamp issues by @rtibbles in https://github.com/learningequality/kolibri/pull/12870
- Fix missing "Create a class and enroll learners" by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13084
- Fix missing device name in SelectDeviceForm by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13082
- Fix missing facility_name in facility removal notification by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13050
- Fix no resources available" instead of the available libraries by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13184
- Fix redirection to all facilities page for multi facility admins by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13096
- Fix snackbar errors in content import by @rtibbles in https://github.com/learningequality/kolibri/pull/12946
- Fix the action not updating some data in the contributions tracking sheet by @MisRob in https://github.com/learningequality/kolibri/pull/13059
- Fix the CLI --pythonpath parameter by @rtibbles in https://github.com/learningequality/kolibri/pull/12874
- Fix the invalid prop on the KTable usage by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13257
- Fix top navigation positioning when window is resized by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/13007
- Fix typo which prevents error from dispatching by @marcellamaki in https://github.com/learningequality/kolibri/pull/12839
- Fix view learn device regression by @ozer550 in https://github.com/learningequality/kolibri/pull/13138
- Fix write-to-disk option for dev server. by @rtibbles in https://github.com/learningequality/kolibri/pull/12850
- Fixed:UserTable Tests by @Abhishek-Punhani in https://github.com/learningequality/kolibri/pull/13088
- Fixes 400 Bad request errors in the masterylog in un started quiz by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13231
- Fixes assigned lessons and quizzes are not visible to the learner by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12992
- Fixes regression in cli plugin apply command. by @rtibbles in https://github.com/learningequality/kolibri/pull/13291
- Fixes: Library - Connection state's position when there are no libraries around #11442 by @yashhash2 in https://github.com/learningequality/kolibri/pull/12948
- Handle Studio 404s by @rtibbles in https://github.com/learningequality/kolibri/pull/12593
- Improved Object Validations with New ValidateObject by @Abhishek-Punhani in https://github.com/learningequality/kolibri/pull/13232
- Make Kolibri compliant with a secure Content Security Policy by @rtibbles in https://github.com/learningequality/kolibri/pull/12851
- Makes sync schedule update/edit string available by @marcellamaki in https://github.com/learningequality/kolibri/pull/13207
- Migrate core logic of deletecontent and exportcontent to a util function by @thesujai in https://github.com/learningequality/kolibri/pull/13211
- Migrate core logic of exportchannel to a utility function and update associated tasks by @thesujai in https://github.com/learningequality/kolibri/pull/13178
- Migrate core logic of importchannel to a utility function and update associated tasks by @thesujai in https://github.com/learningequality/kolibri/pull/13099
- Migrate disconnectionErrorCodes into constants. by @rtibbles in https://github.com/learningequality/kolibri/pull/12583
- Migrated UserTable to KTable (Without Sorting) by @BabyElias in https://github.com/learningequality/kolibri/pull/13028
- Migrating existing references to session getters to use the useUser composable by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12438
- Miscellaneous fixes for things flagged by automated code scan by @rtibbles in https://github.com/learningequality/kolibri/pull/12784
- Modified validators in few files according to new ValidateObject by @Abhishek-Punhani in https://github.com/learningequality/kolibri/pull/13015
- Moving remaining references to session getters to the useUser composable by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12611
- Only show attempts column in lesson reports for practice quizzes by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13046
- Pressing Enter key successfully submits Facility Import Admin Credentials form by @shruti862 in https://github.com/learningequality/kolibri/pull/13090
- Propagate setSelectedResources in quiz search for practice quiz selection. by @rtibbles in https://github.com/learningequality/kolibri/pull/13273
- Quiz creation: Show correct answers for questions by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13038
- Redirect user when loading class summary results in 403 by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12755
- Refactor facilityconfig facility actions into composables by @ozer550 in https://github.com/learningequality/kolibri/pull/13014
- Reintroduce paddingTop when we are in an immersive modal view by @rtibbles in https://github.com/learningequality/kolibri/pull/13162
- Refactor usesearch by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12570
- Refactor accordion component by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12693
- reload on connect in quizsummarypage; avoid possible error w/ missing… by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12554
- Remove channels label fetching in useBaseSearch composable by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12877
- Resource discovery: Implement channel card by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12607
- Resource discovery: Implement folder and resource card by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12418
- Resource selection preview: Include metadata for all resource kinds by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13242
- Remove .js extension from configuration imports for better compatibility by @rtibbles in https://github.com/learningequality/kolibri/pull/13106
- Remove "Activity" tab from learner view by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12816
- Remove any reference to long gone DeviceOwner model in docs and docstrings by @rtibbles in https://github.com/learningequality/kolibri/pull/13269
- Remove attempt at automation of test pypi cleanup. by @rtibbles in https://github.com/learningequality/kolibri/pull/13181
- remove the class name from the appbarr by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13183
- Removes individual learners from the recipient dropdown by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13205
- Swap /lessonstemp to /lessons and remove old Lesson resource selection components by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13167
- Remove FocusTrap in favor of KFocusTrap by @lokesh-sagi125 in https://github.com/learningequality/kolibri/pull/12718
- Remove Hardcoded Color for Button Hover State in `QuizStatus.vue` by @shivam-daksh in https://github.com/learningequality/kolibri/pull/12645
- Remove kolibri PR template in favor of org template by @marcellamaki in https://github.com/learningequality/kolibri/pull/12846
- Remove non-extant TODO by @rtibbles in https://github.com/learningequality/kolibri/pull/12943
- Remove the channel labels from the non-public ContentNode API by @ozer550 in https://github.com/learningequality/kolibri/pull/12985
- Remove unmaintained django debug panel in favour of django debug toolbar by @rtibbles in https://github.com/learningequality/kolibri/pull/13159
- Remove unnecessary icon. Leave kgrid element for spacing. by @rtibbles in https://github.com/learningequality/kolibri/pull/13130
- Remove unnecessary thumbnail setting when it is set on the API response. by @rtibbles in https://github.com/learningequality/kolibri/pull/12605
- Removing legacy vuex module for monitoring connection by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12594
- Replace requests with NetworkClient by @thesujai in https://github.com/learningequality/kolibri/pull/12096
- Replace unwrapped "up" and "down" strings used for aria labeling by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12817
- Replaced the Placeholder with 'Find' for smaller screen sizes by @Abhishek-Punhani in https://github.com/learningequality/kolibri/pull/12997
- Reserved network locations for Studio and KDP by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12703
- Resolve issue with user not seeing updated practice quiz score on TopicsContentPage by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12823
- Revert use of network client in test utils. by @rtibbles in https://github.com/learningequality/kolibri/pull/12549
- Sets default value in the "Recipients" drop-down should be "All" by @AllanOXDi in https://github.com/learningequality/kolibri/pull/13272
- SetupWizard: Fix import facility superuser password by @nucleogenesis in https://github.com/learningequality/kolibri/pull/13213
- Skip initClassInfo request for quiz and lesson resource selection side panel subpages by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13210
- Small tweaks to simplify publishing packages. by @rtibbles in https://github.com/learningequality/kolibri/pull/13009
- Trim section title on save by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/13225
- Update broken references by @emmanuel-ferdman in https://github.com/learningequality/kolibri/pull/12867
- Update content cache key after metadata update. by @rtibbles in https://github.com/learningequality/kolibri/pull/13199
- Update content request handling to only use reserved locations representing Studio by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12881
- Update destroy to destroyed, to properly remove by @marcellamaki in https://github.com/learningequality/kolibri/pull/13259
- Update DownloadButton.vue by @lokesh-sagi125 in https://github.com/learningequality/kolibri/pull/13047
- Update dropshadows to the latest Kolibri Design System guidelines by @Suraj-kumar00 in https://github.com/learningequality/kolibri/pull/12630
- Updates to quiz/lesson resource selection metadata display by @rtibbles in https://github.com/learningequality/kolibri/pull/13258
- Use KRadioButtonGroup in the language switcher modal and on the Device settings page by @muditchoudhary in https://github.com/learningequality/kolibri/pull/12325
- When running under the Kolibri process bus, use a logging queue to prevent reentrant logging errors and file contention by @rtibbles in https://github.com/learningequality/kolibri/pull/12785
- Wrapped KRadioButton groups in KRadioButtonGroup by @iamshobhraj in https://github.com/learningequality/kolibri/pull/12751

</details>


### Developer-facing improvements

In this release are also changes that support our use of Github actions in the Kolibri repo, making it easier to engage with our open source community, as well as documentation updates, release process improvements, and developer tooling improvements.

<details>
  <summary>List of supporting PRs</summary>

  - Use notify_team_new_comment workflow action from .github repo by @rparadowski in https://github.com/learningequality/kolibri/pull/12900
  - Use kolibri-image-pi repo for building raspberry pi image. by @rtibbles in https://github.com/learningequality/kolibri/pull/12869
  - Add required sanity check flags to ensure deletion of testpypi artifacts by @rtibbles in https://github.com/learningequality/kolibri/pull/12978
  - Adds loose pinning of dev docs requirements to ensure correct builds … by @benjaoming in https://github.com/learningequality/kolibri/pull/12466
  - Create github action for automatically cleaning up test pypi. by @rtibbles in https://github.com/learningequality/kolibri/pull/12905
  - Developer documentation updates by @MisRob in https://github.com/learningequality/kolibri/pull/12849
  - Docs: Remove legacy stuff from conf.py by @benjaoming in https://github.com/learningequality/kolibri/pull/12563
  - feat: add community contribution labeling workflow by @iamshobhraj in https://github.com/learningequality/kolibri/pull/13128
  - Feat: added update-spreadsheet action by @GarvitSinghal47 in https://github.com/learningequality/kolibri/pull/12866
  - Final fix to update the AUTHORS for new contributors by @thesujai in https://github.com/learningequality/kolibri/pull/12689
  - Make linting a standalone package by @rtibbles in https://github.com/learningequality/kolibri/pull/12847
  - Make no unused properties checking maximally strict by @rtibbles in https://github.com/learningequality/kolibri/pull/12910
  - Reactivate PR Size labels by @rtibbles in https://github.com/learningequality/kolibri/pull/12811
  - Remove 'pull_request_review' event from the community contributions spreadsheet action by @MisRob in https://github.com/learningequality/kolibri/pull/12950
  - Remove custom eslint rules that are redundant with eslint-plugin-vue rules. by @rtibbles in https://github.com/learningequality/kolibri/pull/12757
  - Turn off gcloudignore parsing as we do not have one, to suppress warnings by @rtibbles in https://github.com/learningequality/kolibri/pull/12803
  - unassign inactive users action by @SukhvirKooner in https://github.com/learningequality/kolibri/pull/13275
  - Update all jobs to avoid ubuntu-20.04 image removal by @rtibbles in https://github.com/learningequality/kolibri/pull/13163
  - Update contact information in the contributing guidelines by @MisRob in https://github.com/learningequality/kolibri/pull/13139
  - Update eslint-plugin-kolibri version. by @rtibbles in https://github.com/learningequality/kolibri/pull/12899
  - Update linting to properly distinguish between warnings and errors. by @rtibbles in https://github.com/learningequality/kolibri/pull/13113
  - Update mappings for theme updates for newly introduced tokens made by @rtibbles in https://github.com/learningequality/kolibri/pull/12765
  - Update obsolete email in the developer documentation by @MisRob in https://github.com/learningequality/kolibri/pull/13202
  - Update our sqlalchemy schema generation to not include constraints by @rtibbles in https://github.com/learningequality/kolibri/pull/13161
  - Update repository information for all npm packages that will be published. by @rtibbles in https://github.com/learningequality/kolibri/pull/12903
  - Update the pretranslate so that it works correctly with the API by @marcellamaki in https://github.com/learningequality/kolibri/pull/13279
  - Update windows installer to prevent errors from long paths by @rtibbles in https://github.com/learningequality/kolibri/pull/13236


</details>

### Dependencies

<details>
  <summary>List of supporting PRs</summary>

- Bump @babel/plugin-syntax-import-assertions from 7.24.7 to 7.25.6 in the babel group by @dependabot in https://github.com/learningequality/kolibri/pull/12634
- Bump @rushstack/eslint-patch from 1.10.3 to 1.10.4 by @dependabot in https://github.com/learningequality/kolibri/pull/12509
- Bump @rushstack/eslint-patch from 1.10.4 to 1.10.5 by @dependabot in https://github.com/learningequality/kolibri/pull/12980
- Bump @rushstack/eslint-patch from 1.10.5 to 1.11.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13191
- Bump @testing-library/jest-dom from 6.4.6 to 6.4.8 by @dependabot in https://github.com/learningequality/kolibri/pull/12480
- Bump @testing-library/jest-dom from 6.4.8 to 6.5.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12614
- Bump @testing-library/jest-dom from 6.5.0 to 6.6.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12768
- Bump @testing-library/jest-dom from 6.6.2 to 6.6.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12829
- Bump @testing-library/user-event from 14.5.2 to 14.6.1 by @dependabot in https://github.com/learningequality/kolibri/pull/13019
- Bump @types/jest from 29.5.12 to 29.5.14 by @dependabot in https://github.com/learningequality/kolibri/pull/12772
- Bump autoprefixer from 10.4.19 to 10.4.20 by @dependabot in https://github.com/learningequality/kolibri/pull/12543
- Bump autoprefixer from 10.4.20 to 10.4.21 by @dependabot in https://github.com/learningequality/kolibri/pull/13193
- Bump axios from 1.7.2 to 1.7.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12542
- Bump axios from 1.7.3 to 1.7.5 by @dependabot in https://github.com/learningequality/kolibri/pull/12604
- Bump axios from 1.7.5 to 1.7.7 by @dependabot in https://github.com/learningequality/kolibri/pull/12638
- Bump axios from 1.7.7 to 1.7.8 by @dependabot in https://github.com/learningequality/kolibri/pull/12883
- Bump axios from 1.7.8 to 1.7.9 by @dependabot in https://github.com/learningequality/kolibri/pull/12926
- Bump axios from 1.7.9 to 1.8.2 by @dependabot in https://github.com/learningequality/kolibri/pull/13182
- Bump axios from 1.8.2 to 1.8.3 by @dependabot in https://github.com/learningequality/kolibri/pull/13227
- Bump axios from 1.8.3 to 1.8.4 by @dependabot in https://github.com/learningequality/kolibri/pull/13252
- Bump babel-loader from 9.1.3 to 9.2.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12831
- Bump babel-loader from 9.2.1 to 10.0.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13154
- Bump commander from 12.1.0 to 13.0.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12974
- Bump commander from 13.0.0 to 13.1.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13017
- Bump core-js from 3.37.1 to 3.38.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12546
- Bump core-js from 3.38.0 to 3.38.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12578
- Bump core-js from 3.38.1 to 3.39.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12864
- Bump core-js from 3.39.0 to 3.40.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12981
- Bump core-js from 3.40.0 to 3.41.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13151
- Bump cross-spawn from 7.0.3 to 7.0.6 by @dependabot in https://github.com/learningequality/kolibri/pull/12856
- Bump css-minimizer-webpack-plugin from 7.0.0 to 7.0.2 by @dependabot in https://github.com/learningequality/kolibri/pull/13190
- Bump csv-parse from 5.5.6 to 5.6.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12885
- Bump dayjs from 1.11.11 to 1.11.12 by @dependabot in https://github.com/learningequality/kolibri/pull/12481
- Bump dayjs from 1.11.12 to 1.11.13 by @dependabot in https://github.com/learningequality/kolibri/pull/12579
- Bump eslint from 8.23.0 to 8.57.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12637
- Bump eslint-config-prettier from 10.0.1 to 10.0.2 by @dependabot in https://github.com/learningequality/kolibri/pull/13148
- Bump eslint-config-prettier from 10.0.2 to 10.1.1 by @dependabot in https://github.com/learningequality/kolibri/pull/13192
- Bump eslint-config-prettier from 9.1.0 to 10.0.1 by @dependabot in https://github.com/learningequality/kolibri/pull/13002
- Bump eslint-plugin-compat from 5.0.0 to 6.0.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12461
- Bump eslint-plugin-compat from 6.0.0 to 6.0.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12798
- Bump eslint-plugin-compat from 6.0.1 to 6.0.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12961
- Bump eslint-plugin-import from 2.29.1 to 2.30.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12639
- Bump eslint-plugin-import from 2.30.0 to 2.31.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12795
- Bump eslint-plugin-jest from 28.10.0 to 28.11.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13018
- Bump eslint-plugin-jest from 28.6.0 to 28.7.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12544
- Bump eslint-plugin-jest from 28.7.0 to 28.8.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12561
- Bump eslint-plugin-jest from 28.8.0 to 28.8.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12640
- Bump eslint-plugin-jest from 28.8.2 to 28.8.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12650
- Bump eslint-plugin-jest from 28.8.3 to 28.9.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12797
- Bump eslint-plugin-jest from 28.9.0 to 28.10.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12970
- Bump eslint-plugin-jest-dom from 5.4.0 to 5.5.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12863
- Bump eslint-plugin-vue from 9.27.0 to 9.28.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12641
- Bump eslint-plugin-vue from 9.28.0 to 9.30.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12796
- Bump eslint-plugin-vue from 9.30.0 to 9.31.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12830
- Bump eslint-plugin-vue from 9.31.0 to 9.32.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12909
- Bump eslint-plugin-vue from 9.32.0 to 9.33.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13194
- Bump espree from 10.1.0 to 10.3.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12774
- Bump express from 4.19.2 to 4.21.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12666
- Bump express from 4.21.0 to 4.21.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12828
- Bump express from 4.21.1 to 4.21.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12929
- Bump express from 4.21.2 to 5.1.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13286
- Bump fast-glob from 3.3.2 to 3.3.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12983
- Bump fuse.js from 7.0.0 to 7.1.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13054
- Bump html-webpack-plugin from 5.6.0 to 5.6.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12769
- Bump http-proxy-middleware from 2.0.6 to 2.0.7 by @dependabot in https://github.com/learningequality/kolibri/pull/12749
- Bump ini from 1.3.5 to 5.0.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12781
- Bump ini from 4.1.3 to 5.0.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12654
- Bump jscodeshift from 0.16.1 to 17.1.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12860
- Bump jscodeshift from 17.1.1 to 17.1.2 by @dependabot in https://github.com/learningequality/kolibri/pull/13006
- Bump jscodeshift from 17.1.2 to 17.3.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13253
- Bump katex from 0.16.11 to 0.16.15 by @dependabot in https://github.com/learningequality/kolibri/pull/12928
- Bump katex from 0.16.15 to 0.16.17 by @dependabot in https://github.com/learningequality/kolibri/pull/12962
- Bump katex from 0.16.17 to 0.16.18 by @dependabot in https://github.com/learningequality/kolibri/pull/12971
- Bump katex from 0.16.18 to 0.16.19 by @dependabot in https://github.com/learningequality/kolibri/pull/12975
- Bump katex from 0.16.19 to 0.16.20 by @dependabot in https://github.com/learningequality/kolibri/pull/13004
- Bump katex from 0.16.20 to 0.16.21 by @dependabot in https://github.com/learningequality/kolibri/pull/13013
- Bump kolibri-constants from 0.2.6 to 0.2.7 by @dependabot in https://github.com/learningequality/kolibri/pull/12652
- Bump kolibri-constants from 0.2.7 to 0.2.8 by @dependabot in https://github.com/learningequality/kolibri/pull/12827
- Bump kolibri-constants from 0.2.8 to 0.2.9 by @dependabot in https://github.com/learningequality/kolibri/pull/13251
- Bump kolibri-design-system from 5.0.0 to 5.0.1 by @dependabot in https://github.com/learningequality/kolibri/pull/13121
- Bump kolibri-design-system from 5.0.0-rc1 to 5.0.0-rc2 by @dependabot in https://github.com/learningequality/kolibri/pull/12580
- Bump kolibri-design-system from 5.0.0-rc2 to 5.0.0-rc3 by @dependabot in https://github.com/learningequality/kolibri/pull/12616
- Bump kolibri-design-system from 5.0.0-rc3 to 5.0.0-rc5 by @dependabot in https://github.com/learningequality/kolibri/pull/12651
- Bump kolibri-design-system from 5.0.0-rc8 to 5.0.0-rc9 by @dependabot in https://github.com/learningequality/kolibri/pull/12833
- Bump kolibri-design-system from 5.0.0-rc9 to 5.0.0-rc10 by @dependabot in https://github.com/learningequality/kolibri/pull/12888
- Bump launch-editor-middleware from 2.8.0 to 2.8.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12545
- Bump launch-editor-middleware from 2.8.1 to 2.9.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12656
- Bump launch-editor-middleware from 2.9.1 to 2.10.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13118
- Bump learningequality/kolibri-installer-debian from 0.16.1 to 0.18.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12986
- Bump loglevel from 1.9.1 to 1.9.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12653
- Bump micromatch from 4.0.5 to 4.0.8 by @dependabot in https://github.com/learningequality/kolibri/pull/12597
- Bump mime-db from 1.52.0 to 1.53.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12457
- Bump mime-db from 1.53.0 to 1.54.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13229
- Bump mini-css-extract-plugin from 2.9.0 to 2.9.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12577
- Bump mini-css-extract-plugin from 2.9.1 to 2.9.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12825
- Bump nanoid from 3.3.7 to 3.3.8 by @dependabot in https://github.com/learningequality/kolibri/pull/12938
- Bump path-to-regexp from 1.8.0 to 1.9.0 in /packages/kolibri-core-for-export by @dependabot in https://github.com/learningequality/kolibri/pull/12658
- Bump peter-evans/create-pull-request from 6 to 7 by @dependabot in https://github.com/learningequality/kolibri/pull/12976
- Bump postcss-html from 1.7.0 to 1.8.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13005
- Bump pre-commit-ci/lite-action from 1.0.2 to 1.0.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12667
- Bump pre-commit-ci/lite-action from 1.0.3 to 1.1.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12721
- Bump prettier from 3.3.2 to 3.3.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12459
- Bump prettier from 3.3.3 to 3.4.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12886
- Bump prettier from 3.4.1 to 3.4.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12931
- Bump prettier from 3.4.2 to 3.5.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13069
- Bump prettier from 3.5.0 to 3.5.2 by @dependabot in https://github.com/learningequality/kolibri/pull/13117
- Bump prettier from 3.5.2 to 3.5.3 by @dependabot in https://github.com/learningequality/kolibri/pull/13153
- Bump react-window from 1.8.10 to 1.8.11 by @dependabot in https://github.com/learningequality/kolibri/pull/12963
- Bump recast from 0.23.9 to 0.23.11 by @dependabot in https://github.com/learningequality/kolibri/pull/13150
- Bump rtlcss from 4.1.1 to 4.2.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12506
- Bump rtlcss from 4.2.0 to 4.3.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12618
- Bump sass-loader from 14.2.1 to 15.0.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12482
- Bump sass-loader from 15.0.0 to 16.0.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12510
- Bump sass-loader from 16.0.0 to 16.0.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12576
- Bump sass-loader from 16.0.1 to 16.0.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12773
- Bump sass-loader from 16.0.2 to 16.0.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12800
- Bump sass-loader from 16.0.3 to 16.0.4 by @dependabot in https://github.com/learningequality/kolibri/pull/12932
- Bump sass-loader from 16.0.4 to 16.0.5 by @dependabot in https://github.com/learningequality/kolibri/pull/13119
- Bump semver from 5.7.1 to 7.7.1 by @dependabot in https://github.com/learningequality/kolibri/pull/13200
- Bump semver from 7.6.2 to 7.6.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12458
- Bump semver from 7.6.3 to 7.7.1 by @dependabot in https://github.com/learningequality/kolibri/pull/13053
- Bump slackapi/slack-github-action from 1.26.0 to 1.27.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12643
- Bump stylelint-config-sass-guidelines from 11.1.0 to 12.1.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12793
- Bump terser-webpack-plugin from 5.3.10 to 5.3.11 by @dependabot in https://github.com/learningequality/kolibri/pull/12959
- Bump terser-webpack-plugin from 5.3.11 to 5.3.12 by @dependabot in https://github.com/learningequality/kolibri/pull/13152
- Bump terser-webpack-plugin from 5.3.12 to 5.3.14 by @dependabot in https://github.com/learningequality/kolibri/pull/13189
- Bump the babel group across 1 directory with 2 updates by @dependabot in https://github.com/learningequality/kolibri/pull/12512
- Bump the babel group with 2 updates by @dependabot in https://github.com/learningequality/kolibri/pull/12454
- Bump the babel group with 2 updates by @dependabot in https://github.com/learningequality/kolibri/pull/12612
- Bump the babel group with 2 updates by @dependabot in https://github.com/learningequality/kolibri/pull/13039
- Bump the babel group with 2 updates by @dependabot in https://github.com/learningequality/kolibri/pull/13187
- Bump the babel group with 3 updates by @dependabot in https://github.com/learningequality/kolibri/pull/13066
- Bump the babel group with 3 updates by @dependabot in https://github.com/learningequality/kolibri/pull/13115
- Bump the babel group with 4 updates by @dependabot in https://github.com/learningequality/kolibri/pull/12766
- Bump typescript from 5.5.3 to 5.5.4 by @dependabot in https://github.com/learningequality/kolibri/pull/12479
- Bump typescript from 5.5.4 to 5.6.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12657
- Bump typescript from 5.6.2 to 5.6.3 by @dependabot in https://github.com/learningequality/kolibri/pull/12794
- Bump typescript from 5.6.3 to 5.7.2 by @dependabot in https://github.com/learningequality/kolibri/pull/12884
- Bump typescript from 5.7.2 to 5.7.3 by @dependabot in https://github.com/learningequality/kolibri/pull/13003
- Bump typescript from 5.7.3 to 5.8.2 by @dependabot in https://github.com/learningequality/kolibri/pull/13149
- Bump typescript from 5.8.2 to 5.8.3 by @dependabot in https://github.com/learningequality/kolibri/pull/13307
- Bump ua-parser-js from 1.0.38 to 1.0.39 by @dependabot in https://github.com/learningequality/kolibri/pull/12799
- Bump ua-parser-js from 1.0.39 to 1.0.40 by @dependabot in https://github.com/learningequality/kolibri/pull/12969
- Bump video.js from 7.21.6 to 7.21.7 by @dependabot in https://github.com/learningequality/kolibri/pull/13254
- Bump web-streams-polyfill from 4.0.0 to 4.1.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12982
- Bump webpack from 5.92.1 to 5.93.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12460
- Bump webpack from 5.93.0 to 5.94.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12615
- Bump webpack from 5.94.0 to 5.96.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12832
- Bump webpack from 5.96.1 to 5.97.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12907
- Bump webpack from 5.97.0 to 5.97.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12927
- Bump webpack from 5.97.1 to 5.98.0 by @dependabot in https://github.com/learningequality/kolibri/pull/13120
- Bump webpack from 5.98.0 to 5.99.5 by @dependabot in https://github.com/learningequality/kolibri/pull/13308
- Bump webpack-cli from 5.1.4 to 6.0.1 by @dependabot in https://github.com/learningequality/kolibri/pull/12968
- Bump webpack-dev-server from 5.0.4 to 5.1.0 by @dependabot in https://github.com/learningequality/kolibri/pull/12642

</details>

## New Contributors
* @shivam-daksh made their first contribution in https://github.com/learningequality/kolibri/pull/12645
* @iamshobhraj made their first contribution in https://github.com/learningequality/kolibri/pull/12644
* @BabyElias made their first contribution in https://github.com/learningequality/kolibri/pull/12571
* @Suraj-kumar00 made their first contribution in https://github.com/learningequality/kolibri/pull/12630
* @lokesh-sagi125 made their first contribution in https://github.com/learningequality/kolibri/pull/12718
* @m3tal10 made their first contribution in https://github.com/learningequality/kolibri/pull/12835
* @emmanuel-ferdman made their first contribution in https://github.com/learningequality/kolibri/pull/12867
* @manzil-infinity180 made their first contribution in https://github.com/learningequality/kolibri/pull/12818
* @rparadowski made their first contribution in https://github.com/learningequality/kolibri/pull/12900
* @yashhash2 made their first contribution in https://github.com/learningequality/kolibri/pull/12948
* @Abhishek-Punhani made their first contribution in https://github.com/learningequality/kolibri/pull/12997
* @malviya-rajveer made their first contribution in https://github.com/learningequality/kolibri/pull/13024
* @KumarVivekPathak made their first contribution in https://github.com/learningequality/kolibri/pull/13029
* @GautamBytes made their first contribution in https://github.com/learningequality/kolibri/pull/13063
* @shruti862 made their first contribution in https://github.com/learningequality/kolibri/pull/13090
* @SukhvirKooner made their first contribution in https://github.com/learningequality/kolibri/pull/13275

**Full Changelog**: https://github.com/learningequality/kolibri/compare/v0.17.5...v0.18.0-beta4


## 0.17.4

### Fixed
- Ensures users can 'Continue' from the SelectFacilityForm component in SetupWizard by @rtibbles in https://github.com/learningequality/kolibri/pull/12893


## 0.17.3

### Changed
- Improve learn folder contents display by @rtibbles in https://github.com/learningequality/kolibri/pull/12737
- Update KDS theme token by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12742
- Final token updates by @marcellamaki in https://github.com/learningequality/kolibri/pull/12754

### Added
- Add Fulfulde translations by @radinamatic in https://github.com/learningequality/kolibri/pull/12738
- Update morango for conditional indexes on store to improve deserialization performance. by @rtibbles in https://github.com/learningequality/kolibri/pull/12747

### Fixed
- Settings is not correct after tzlocal update by @jredrejo in https://github.com/learningequality/kolibri/pull/12683
- Add missing `indeterminate` states on Select All checkboxes by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12587
- Fix import channel in Postgresql  by @jredrejo in https://github.com/learningequality/kolibri/pull/12709
- Branding tweaks by @rtibbles in https://github.com/learningequality/kolibri/pull/12736
- Tweaks to CLI and message extraction utility function by @rtibbles in https://github.com/learningequality/kolibri/pull/12320
- Delete resource from everywhere when force_delete is selected by @thesujai in https://github.com/learningequality/kolibri/pull/12680
- Dont delete the entire channel when deleting a single content by @thesujai in https://github.com/learningequality/kolibri/pull/12740
- Prevent access to undefined AttemptLogs while looking at reports by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12723
- Update StorageNotification.vue to prevent undefined access if device plugin is disabled by @rtibbles in https://github.com/learningequality/kolibri/pull/12724
- Update favicon to be available when the default theme is disabled by @marcellamaki in https://github.com/learningequality/kolibri/pull/12760
- Fix on my own merge account KCheckbox issue by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12761

## 0.17.2

### Changed
- Make 'save to device' file downloads initiate immediately by @rtibbles in [#12675](https://github.com/learningequality/kolibri/pull/12675)


## 0.17.1

### Added
- Allow redirects for file downloads by @rtibbles in [#12309](https://github.com/learningequality/kolibri/pull/12309)
- Add configuration option to disable Zeroconf by @ozer550 in [#12620](https://github.com/learningequality/kolibri/pull/12620)


### Changed
- Optimise Library page load time when channels have large thumbnails by @thesujai in [#12530](https://github.com/learningequality/kolibri/pull/12530)
- Provide more helpful error state when trying to import from unprovisioned device during device setup by @nucleogenesis in [#12397](https://github.com/learningequality/kolibri/pull/12397)
- Upgrade Python dependencies by @rtibbles in [#12165](https://github.com/learningequality/kolibri/pull/12165)

### Fixed
- Preserve the subfolder structure inside the static folder on unzipping for h5p and HTML5 zips by @rtibbles in [#12538](https://github.com/learningequality/kolibri/pull/12538)
- Fixed variety of inconsistencies with activity notifications by @AlexVelezLl in [#12386](https://github.com/learningequality/kolibri/pull/12386)
- Fixed mismatch between coach Reports and generated CSV by @AlexVelezLl in [#12628](https://github.com/learningequality/kolibri/pull/12628)


## 0.17.0

### Added

#### New Feature: Updates to quiz workflow with new sections and question replacement functionality

Updates to our quizzes provide coaches more flexibility in creating quizzes by swapping out questions or removing questions to create the quiz they want. Coaches choose resources from which questions are selected. They can then review individual questions, and replace or remove individual questions, customising the quiz to learner needs. Coaches can also divide the quiz into sections of up to 25 questions each, allowing for longer quizzes.

Noteworthy technical updates include updating to a third version of our Exam model data schema, the addtion of a new draft exam model to allow editing of quizzes before they are made active/syncable, introducing a new accordion component, and changing the quiz creation routing structure to use nested routes and a side-panel style UX.

##### List of supporting PRs

- Restore exam/utils.spec.js to previous version; tests pass by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11155
- Enhanced Quizzes: Initial frontend state management API by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11088
- adds the new Quiz Creation Component  by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11077
- Enhanced Quiz Management: Side panel and routing foundations by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11132
- Build flexible and accessible accordion component by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11087
- Update Exam model with V3 question_sources, update relevant JS utils by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11025
- Quiz creation DEBUG data improvements by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11662
- Quiz rebase regression fixes by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11661
- Quiz foundations & data connection by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11277
- Section settings side panel by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11314
- Feature  quiz section tabs with overflow by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11382
- Finishing up the Quiz Root Page by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11434
- [Accordion] Add "collapse all"/ "expand all" logic into AccordionContainer by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/11565
- Migrate quizForge object references to composition API standard by @ozer550 in https://github.com/learningequality/kolibri/pull/11562
- Remove stray references to quizForge by @marcellamaki in https://github.com/learningequality/kolibri/pull/11633
- Fix title validation error bug in quizSection by @ozer550 in https://github.com/learningequality/kolibri/pull/11642
- Coach Quiz Exercise Resources by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11682
- Question sources by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11658
- Update ExamSerializers according to v3 model by @ozer550 in https://github.com/learningequality/kolibri/pull/11674
- useFetchTree specs by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11766
- Synchronise user selections with Quiz Creation State  by @ozer550 in https://github.com/learningequality/kolibri/pull/11783
- EQM clean up resouce selection by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11764
- Conditionalizes the loading action for quiz routes by @akolson in https://github.com/learningequality/kolibri/pull/11822
- Quiz creation bookmark selection by @ozer550 in https://github.com/learningequality/kolibri/pull/11835
- Questions randomly selected from resource pool by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11823
- number of resources updates on selection by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11825
- Resource selection UX- Improvement  by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11815
- Quiz Creation Select Resources - Keyword search by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/11887
- Quiz creation resource selection: Topic selection & "Select all"  by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11864
- Fix: Side panel closing confirmation & logic in child component by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11862
- Quiz creation: Question replacement & a bevy of misc fixes and polish by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11937
- Move handleReplacement logic from ReplaceQuestions.vue to useQuizCreation.js by @KshitijThareja in https://github.com/learningequality/kolibri/pull/12099
- Use router.replace for redirect. by @rtibbles in https://github.com/learningequality/kolibri/pull/12067
- Quiz editing capability for not yet activated quizzes by @rtibbles in https://github.com/learningequality/kolibri/pull/12232
- Move NotEnoughResourcesModal to CreateQuizSection by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12249
- Remove empty sections from quizzes on publish by @rtibbles in https://github.com/learningequality/kolibri/pull/12252
- Revert change that prevented search redirect in all cases. by @rtibbles in https://github.com/learningequality/kolibri/pull/12236
- Updates to sections in ExamPage by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12182
- EQM: On first save, update the quiz's ID when redirecting by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12283
- Use && instead of & for logical AND. by @rtibbles in https://github.com/learningequality/kolibri/pull/12254
- Update to allow and implement randomization of sections. by @rtibbles in https://github.com/learningequality/kolibri/pull/12278
- EQM Fix: Use can actually select topics by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12265
- EQM: Validation improvements by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12281
- Fix single quiz selection flow by @rtibbles in https://github.com/learningequality/kolibri/pull/12274
- Improve messaging around question replacement requirements by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12122
- Exams: Create them, take them, view reports by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12111
- Add "Update resources" option to Options dropdown by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12137
- Quiz creation: Snackbar improvements by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12080
- Revert ExamPage BottomAppBar to previous version (0.16.x) by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12169
- Fixes issue where activeTabId is not set when viewing quiz reports for a group by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12179
- fixes user selection getting lost on closing the sidepanel by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12160
- Fixes progress indication bug by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12185
- EQM Lesson regression fixes by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12354
- EQM: Side panel back / close icon UX improvements by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12311
- Link to new quiz creation properly. by @rtibbles in https://github.com/learningequality/kolibri/pull/12352
- Display question titles with displayQuestionTitle by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12369
- EQM: Bookmarks not linking anywhere in resource selection by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12360
- Prevents errors on section deletion by @rtibbles in https://github.com/learningequality/kolibri/pull/12363
- EQM: Difficult questions reports fix by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12372
- Fix mis-match condition in replacement question array by @marcellamaki in https://github.com/learningequality/kolibri/pull/12353
- Wrap section deletion modal in focus trap by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12373
- Use useNow composable in ElapsedTime component by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12377
- Load channel content on remove filter by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12379
- Fix question listing and navigation in quiz reports by @rtibbles in https://github.com/learningequality/kolibri/pull/12359
- Allow quiz level learners see fixed order to be edited after a quiz is opened. by @rtibbles in https://github.com/learningequality/kolibri/pull/12307
- make sure the question count v-model uses .number by @marcellamaki in https://github.com/learningequality/kolibri/pull/12407
- Update folder selection logic to handle deep folders. by @rtibbles in https://github.com/learningequality/kolibri/pull/12381
- Add in submit quiz button for non-large screen sizes. by @rtibbles in https://github.com/learningequality/kolibri/pull/12412
- Exam models date_created updates by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12413
- EQM: Sections for quiz detail page by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12384
- EQM: What happens when I refresh? by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12393
- Count descendants not ancestors by @rtibbles in https://github.com/learningequality/kolibri/pull/12394
- What a drag by @marcellamaki in https://github.com/learningequality/kolibri/pull/12396
- Coach questions preview: Fix background and selection colors + resolve linter errors by @MisRob in https://github.com/learningequality/kolibri/pull/12427
- Fix ordering of quizzes on plan page. by @rtibbles in https://github.com/learningequality/kolibri/pull/12426
- EQM: Fix unlinted files by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12428
- Hide Difficult questions tab if the quiz is still a draft by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12437
- Fix quiz preview by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12436
- EQM: Post-bash quickfixes by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12293
- EQM: Side panel bottom nav by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12391
- Card fixes by @marcellamaki in https://github.com/learningequality/kolibri/pull/12374
- Adds modal before delete section by @akolson in https://github.com/learningequality/kolibri/pull/12101
- Update exam.question_count calculation by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12196
- Remove resource pool from exam serializer, don't send in API call by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12200
- fixes quizzes not showing "File size for download" value properly by @AllanOXDi in https://github.com/learningequality/kolibri/pull/12202
- Allow delete all questions by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12216
- EQM: Notify not enough resources to replace questions by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12219
- Fix replacements order by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12218
- Remove browser search cancel button by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12329
- Fix white space on top of tabs dividing line by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12380
- EQM: Only show save success message when saving by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12389
- Exam Page: Move smaller screen timer to top by @nucleogenesis in https://github.com/learningequality/kolibri/pull/12485

#### Github integrations, actions, dev workflow updates

In 0.17, we have also improved many automated workflows to support the dev team, including increased use of dependabot, Slack integrations, and expanded use of Github actions for continuous integration and deployment.

##### List of supporting PRs

- Notify our slack on contributors' issue comments by @vkWeb in https://github.com/learningequality/kolibri/pull/11564
- Use the official GH action for Slack by @vkWeb in https://github.com/learningequality/kolibri/pull/11623
- Authors are pilots of kolibri by @vkWeb in https://github.com/learningequality/kolibri/pull/11805
- Fixes the broken slack contributor notification gh action by @vkWeb in https://github.com/learningequality/kolibri/pull/11922
- Introduce flake8-print as pre-commit hook with migration of print to logger by @thesujai in https://github.com/learningequality/kolibri/pull/11994
- Try to fix Slack notifications actions failing when " character is in the issue title by @MisRob in https://github.com/learningequality/kolibri/pull/11902
- Remove buildkite status check label from readme by @bjester in https://github.com/learningequality/kolibri/pull/11924
- Install KDS patch and configure dependabot to run on Wednesday by @MisRob in https://github.com/learningequality/kolibri/pull/11918
- Attempt to fix GH notification action by @MisRob in https://github.com/learningequality/kolibri/pull/11928
- Add missing quotes to the notification GH action by @MisRob in https://github.com/learningequality/kolibri/pull/11935
- Feature: GitHub Actions Workflow for Scheduled Morango Integration Tests by @GarvitSinghal47 in https://github.com/learningequality/kolibri/pull/11931
- Increase number of dependabot PRs by @rtibbles in https://github.com/learningequality/kolibri/pull/11943
- Add pre-commit-ci-lite action to automate PR lint fixes by @thesujai in https://github.com/learningequality/kolibri/pull/12034

#### Additional features and improvements

Additional updates include the ability to create a new facility on an existing Kolibri, and updating the tab title to include a realtime percentage of tasks. To help ensure robustness and reliability, we have expanded the range and coverage of our unit tests.

##### List of supporting PRs

- added functionality to create new facility on existing kolibri by @Jaspreet-singh-1032 in https://github.com/learningequality/kolibri/pull/11197
- added test cases for create new facility feature by @Jaspreet-singh-1032 in https://github.com/learningequality/kolibri/pull/11303
- Issue 10255 improve coach tabs accessibility by @muditchoudhary in https://github.com/learningequality/kolibri/pull/11501
- Realtime percentage of tasks in the tab title by @GarvitSinghal47 in https://github.com/learningequality/kolibri/pull/11696
- tests: Complete the test suite for `TriesOverview` Component by @EshaanAgg in https://github.com/learningequality/kolibri/pull/11906
- Add regression testing for channel update deletion behaviour by @thesujai in https://github.com/learningequality/kolibri/pull/11896
- tests: Add tests for some components by @EshaanAgg in https://github.com/learningequality/kolibri/pull/11910
- test: Add complete test suite for `InteractionItem` by @EshaanAgg in https://github.com/learningequality/kolibri/pull/11920
- tests: add initial test suite for `CoreMenu` by @EshaanAgg in https://github.com/learningequality/kolibri/pull/11934
- tests: add test suites for `SelectSourceModal` and `ConfirmationRegisterModal` by @EshaanAgg in https://github.com/learningequality/kolibri/pull/12060
- tests: add tests for some files in `ContentRenderer` by @EshaanAgg in https://github.com/learningequality/kolibri/pull/12056
- Add write to disk options for build command by @thesujai in https://github.com/learningequality/kolibri/pull/12006
- Added code for deletion of csv files in line #397 by @oge1ata in https://github.com/learningequality/kolibri/pull/12020
- Update useUser mocks for updated API. by @rtibbles in https://github.com/learningequality/kolibri/pull/12051
- tests: add tests for some components by @EshaanAgg in https://github.com/learningequality/kolibri/pull/12108
- Add notification for downloaded content completion by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12295
- Update LOD description in FullOrLearnOnlyDeviceForm component by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12285
- Added another condition for TOPICS_TOPIC_SEARCH redirection by @Wck-iipi in https://github.com/learningequality/kolibri/pull/12019
- Added neeeded values for BaseValuesViewset by @jredrejo in https://github.com/learningequality/kolibri/pull/12346
- Add string prompt to log in with existing username or create an account by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12310

### Breaking Changes

[Support for Python 2.7, deprecated in 0.16, has been dropped](https://github.com/learningequality/kolibri/pull/11654). Support for Internet Explorer 11, deprecated in 0.16, has been dropped.


### Changed

#### Dependencies and support

Important technical changes include adding Python 3.12 support, upgrading Django to version 3.2, upgrading KDS to v4.4.0, and upgrading the Perseus exercise library to a recently released version, and changes to our linting tools to simplify and improve our developer experience. Support for Python 2.7, deprecated in 0.16, has been dropped. Support for Internet Explorer 11, deprecated in 0.16, has been dropped.

##### List of supporting PRs

- Remove Python 2.7 support by @rtibbles in https://github.com/learningequality/kolibri/pull/11654
- Remove Python 2.7 deprecation warning. by @rtibbles in https://github.com/learningequality/kolibri/pull/11713
- With 2.7 dropped, use shutil disk_usage function universally. by @rtibbles in https://github.com/learningequality/kolibri/pull/12041
- Update Django to version 3.2 by @rtibbles in https://github.com/learningequality/kolibri/pull/11974
- Reduce the size of the wheel file by @rtibbles in https://github.com/learningequality/kolibri/pull/12361
- Consolidate browser compatibility data, drop IE11 support by @rtibbles in https://github.com/learningequality/kolibri/pull/11685
- Upgrade to KDS v3.0.0 and reference npm package by @MisRob in https://github.com/learningequality/kolibri/pull/11873
- Upgrade perseus to npm published version. by @rtibbles in (#9759, #12362)
- Upgrade morango. by @rtibbles in https://github.com/learningequality/kolibri/pull/12408
- Linting updates by @rtibbles in https://github.com/learningequality/kolibri/pull/9698
- Upgrade the mac app. by @rtibbles in https://github.com/learningequality/kolibri/pull/12416
- Introduce Vue Testing Library by @EshaanAgg in https://github.com/learningequality/kolibri/pull/11833
- Create and use a standard utility library for handling zip files in the frontend by @rtibbles in https://github.com/learningequality/kolibri/pull/11539
- updated use of entry_points according to importlib version >3.6.0 by @im-NL in https://github.com/learningequality/kolibri/pull/11417

#### Updates to string processes (developer-facing)
This release is the first time that Kolibri will be using "feature file" strings, where all new strings for a feature are introduced into one files. This reduces the overhead for both dev work and translation work.

##### List of supporting PRs

- Add enhanced quiz management strings - first draft for dev work by @marcellamaki in https://github.com/learningequality/kolibri/pull/11189
- Composable translators by @rtibbles in https://github.com/learningequality/kolibri/pull/10960
- Move jump to question string into enhanced quiz management strings. by @rtibbles in https://github.com/learningequality/kolibri/pull/12323
- Additional strings by @marcellamaki in https://github.com/learningequality/kolibri/pull/12336
- Correct strings that were manually edited on Crowdin by @radinamatic in https://github.com/learningequality/kolibri/pull/12347
- Fix coreStrings import in AttemptLogList by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12429
- First pass string updates following UX writing and ditto review by @marcellamaki in https://github.com/learningequality/kolibri/pull/12312
- Add strings for post-setup onboarding guide component by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/12113

#### Refactors
Key refactors include replacing `KResponsiveWindow` with `useKResponsiveWindow` across Kolibri, work toward improving the router handler architecture in Coach, and continue work towards introducing more composables.

##### List of supporting PRs

- Replace KResponseWindow with useKResponseWindow (#11349, #11355, #11427, #11358, #11366, #11474, #11369, #11346, #11414, #11529, #11997)
- Changed KContentRenderer to ContentRenderer. by @ShivangRawat30 in https://github.com/learningequality/kolibri/pull/11289
- Replaced isEmbeddedWebView with isAppContext by @AllanOXDi in https://github.com/learningequality/kolibri/pull/11715
- Improved router handlers architecture in Coach - part 1 by @ShivangRawat30 in (#11570, #11675, #11900)
- Update condition to display new label for content imports by @LianaHarris360 in https://github.com/learningequality/kolibri/pull/11695
- Use consistent KDS imports across the whole Kolibri by @PR4NJ41 in https://github.com/learningequality/kolibri/pull/11742
- Standardize ContentCardList Component and Introduce ViewMoreButtonStates by @GarvitSinghal47 in https://github.com/learningequality/kolibri/pull/11865
- useUser can now get all states and getters by @Wck-iipi in https://github.com/learningequality/kolibri/pull/12027
- Replace `TextTruncatorCss` with `KTextTruncator` by @jasonmokk in https://github.com/learningequality/kolibri/pull/12215
- Refactor default_theme paths/structure by @marcellamaki in https://github.com/learningequality/kolibri/pull/12207
- App navigation refactor by @rtibbles in https://github.com/learningequality/kolibri/pull/12084
- Refactored HomePage route handler to fetch initClassInfo and getFacil… by @shubh1007 in https://github.com/learningequality/kolibri/pull/12358


#### Docs related updates

Updates to developer documentation builds and improved copywriting.

##### List of supporting PRs

- docs: add new documentation related to testing style guide and testing template by @EshaanAgg in https://github.com/learningequality/kolibri/pull/12083
- Adds loose pinning of dev docs requirements to ensure correct builds … by @benjaoming in https://github.com/learningequality/kolibri/pull/12466
- Docs: Fixed typos by @Mohamedkhaled81 in https://github.com/learningequality/kolibri/pull/11927
- Update development documentation by @MisRob in https://github.com/learningequality/kolibri/pull/11917
- Tweniee/Isssue:#11361 Updated Document for PR release  by @Tweniee in https://github.com/learningequality/kolibri/pull/11512

### Fixed
Fixes include accessibility updates, bug fixes, code cleanup, and UI improvements.

##### List of supporting PRs

- Maintain the zoom settings for the PDF viewer by @nikkuAg in https://github.com/learningequality/kolibri/pull/11165
- Hide the table when data is loading by @muditchoudhary in https://github.com/learningequality/kolibri/pull/11238
- Catch and redirect 401 errors when browsing remotely by @vkWeb in https://github.com/learningequality/kolibri/pull/11119
- Adds connection error exception to handle redis connection failure by @akolson in https://github.com/learningequality/kolibri/pull/11296
- Ensure Enter key works as continue button click on Setup Wizard by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/11537
- Fix topic header tests by @nucleogenesis in https://github.com/learningequality/kolibri/pull/11535
- fix the position of the sidepanelmodal by @iskipu in https://github.com/learningequality/kolibri/pull/11607
- Truncate long lesson title by @nikkuAg in https://github.com/learningequality/kolibri/pull/11874
- Issue 10254: Improve coach tabs accessibility of Reports Lesson Tab by @muditchoudhary in https://github.com/learningequality/kolibri/pull/11606
- Unnecessary kolibri store in tests by @nick2432 in https://github.com/learningequality/kolibri/pull/11852
- Fix failing csv report generation api test in different timezones by @thesujai in https://github.com/learningequality/kolibri/pull/11933
- Remove AssessmentMetadataState mapper and update to direct API access… by @AymanHammadi in https://github.com/learningequality/kolibri/pull/11940
- Remove Banner for INSUFFICIENT_STORAGE while in device plugin by @iskipu in https://github.com/learningequality/kolibri/pull/11809
- ENFORCE CSRF verification in API to be accessed by a browser strictly by @thesujai in https://github.com/learningequality/kolibri/pull/11978
- fix: content_id access from wrong object by @himanshuc3 in https://github.com/learningequality/kolibri/pull/11993
- Overrides prop default flipping behaviour by @kafukoM in https://github.com/learningequality/kolibri/pull/12015
- Fix #9067: Redirect signed-out users to resource URL without lessonId or classId by @GSAprod in https://github.com/learningequality/kolibri/pull/12039
- Properly redirect on authentication failure by @rtibbles in https://github.com/learningequality/kolibri/pull/12414
- Fixing typo in useUser composable getter by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12231
- Fix Vue Tesing Library routes bug by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12105
- Fix language switcher responsiveness by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/11977
- Fixing typo in useUser composable getter (again) by @nathanaelg16 in https://github.com/learningequality/kolibri/pull/12235
- App script cleanup by @rtibbles in https://github.com/learningequality/kolibri/pull/12155
- trying to fix integrity errors before migrating tables by @jredrejo in https://github.com/learningequality/kolibri/pull/12279
- Fix pdf css import by @AlexVelezLl in https://github.com/learningequality/kolibri/pull/12348
- Fix hitherto unnoticed regression in channel upgrade by @rtibbles in https://github.com/learningequality/kolibri/pull/12251
- Don't put csrf protection on endpoint that we use to set csrf cookie. by @rtibbles in https://github.com/learningequality/kolibri/pull/12371
- Ensure skip to main content logic is working by @marcellamaki in https://github.com/learningequality/kolibri/pull/12439
  - Update automatic download setting default to False if running in a remote content context. by @rtibbles in https://github.com/learningequality/kolibri/pull/12395


## 0.16.0

### Features

#### Robust syncing of user data and resources
##### Support for quick learner setup and independent learners
- Kolibri has a new onboarding experience which allows joining a facility, and streamlines getting started as an independent learner with a rapid “on my own setup” option
- Independent learners can transfer their existing data and learning progress to a facility.
##### Resource discovery
- Assigned lesson and quiz resources are now automatically transferred to learner devices, allowing coaches to dynamically manage learner content, rather than an administrator needing to import all content devices before distribution.
- Administrators and independent learners are now able to view other Kolibri Libraries on their local network and browse their resources, without having to import content. If they are connected to the internet, they will be able to browse resources on the Kolibri Content Library (hosted on Kolibri Studio).
- Administrators can allow learners to download resources from other Kolibri Libraries to their device to view within Kolibri, even when they are no longer on the same network.
##### Support for administrators
- Administrators have a new option to add a PIN on learner-only devices, which allows an administrator easy access to the Device page while preventing learners from inadvertently making changes.
- Administrators are now able to schedule syncing of facility data on a recurring basis at custom intervals.
- When exporting log files, administrators are able to select the date range for the logs.
##### Practice quizzes
- This release supports practice quizzes, which are resources in the format of quizzes that learners can take in preparation for an assessment. They are able to see their score, and retry as many times as they would like, independently. Practice quiz resources are available through the Library, or can be assigned as part of a lesson. The same questions can also be assigned as a coach assigned quiz as a standardized assessment.

### Changes

#### Dev documentation/dev updates
- Updated node version to 18
- Getting started documentation updated
- Updated to Webpack 5
- Created Github actions for build pipeline
- Created Github action to add assets to PRs
- Task API changes have been finalized after initial work in 0.15. Documentation is now updated to describe how to interact with the API and define tasks in plugins.

#### Architectural changes
- There is a new page architecture that is used across all Kolibri plugins, and the component has been removed. (Selected relevant high level issues and PRs: #9102, #9128, 9134.)
- The Kolibri Process Bus has been updated to support easier composability for custom deployment architectures.
- Conditional promises have been removed.
- To support the new onboarding process for Kolibri, Kolibri apps can now access a capability to provide access controls based on the currently active operating system user.

#### API Breaking Changes
- Tasks API has now been finalized, previous methods for interacting with tasks that do not use the pluggable Tasks API have been removed.
- The drive info endpoint has been moved the into the device app but functionality remains the same
- The API for coordinating learner only device synchronization within a local area network has been updated to ensure robust and reliable syncing. Any users wishing to use learner only device synchronization must update all Kolibri devices to this newer version

#### API Additions (non-breaking changes)
- REST API for enabling and disabling plugins
- Add API endpoint and hook driven capability for UI initiated device restart
- Public signup viewset
- Public content metadata endpoints to support granular resource import

#### Accessibility improvements
- Landmarks have been added and refined across the Library page and its related subpages, for better accessibility. This is a first step in support of more robust accessibility support, particularly in terms of page navigation for screen reader users.

### Deprecations
- Support for Python 2.7 will be dropped in the upcoming version, 0.17. Upgrade your Python version to Python 3.6+ to continue working with Kolibri. More recent versions of Python 3 are recommended.
- Support for this Internet Explorer 11 will be dropped in the upcoming version, 0.17. We recommend installing other browsers, such as Mozilla Firefox or Google Chrome, in order to continue working with Kolibri.

### Kolibry Design System upgrades
- Kolibri is now using kolibri-design-system v2.0.0 (a major version upgrade!). Please see the KDS release's Github page for documentation and full details about breaking changes and new features.



## 0.15.12

### Added
* Added localization support for Haitian Creole
* Added annotation layer to PDF viewer

### Changed
* Updated PID file when the zipcontent server starts

### Fixed
* Ensure `startremotecontentimport` and `startdiskcontentimport` pass through the `fail_on_error` option to the importcontent command


## 0.15.11

### Fixed
* Fixed progress tracking edge case where float rounding issues prevent progress reaching 100%


## 0.15.10

### Added
* Add PDF accessibility support for screen readers
* Add support for captions for audio

### Fixed
* Fixed overflowing title alignment on content cards
* Improved visible focus outline
* Fixed positioning of transcript layout when language is set to a right-to-left language
* Fixed calculation for number of users displayed on the User Tables

### Changed
* Only display the completion modal on the finish event when the resource is also complete

## 0.15.9
### Added
* Specified pre-commit hook python version to 3.10
* Added Python3.11 to supported python versions
### Fixed
* Fixed PDF completion issues
* Fixed learner-facing metadata display of content duration
* Fixed "Mark as complete" functionality to allow learners to mark resources as complete when allowed by the resource
* Disable forward/back buttons on EPUB renderer until locations are properly loaded
* Fix issue that causes learners to skip every other question in an exercise
* Fix searchbox outline
* Fix title spacing in app bar
* Fix bookmark data loading issues that caused inaccurate bookmark display
### Changed
* Changed \_\_init\_\_.py  from 5 tuple to 3
* Set a max width on Library main content grid to display properly on extra large monitors
* Remove "All options" from filters in Learn search/filtering side panel
* Switch display of the completion modal to require both completed progress and the resource to be finished
* Add tests to assert totalattempts behaviour
* Display completion modals only on first completion, and allow user to reopen the modal if needed
* Update category search for each level to be searchable
* Update KDS to 1.4.1

## 0.15.8

### Added
* Adds job storage sanity check to ensure that Kolibri will not fail to start if the asynchronous job storage is malformed

### Changed
* Logging: remove unused simple formatter, add asctime to color formatter
* Order resume content display by last interaction
* Upgrade morango and lower default sync chunk size through CLI
* Make learners only appear once in reports when assigned from both groups and individually to lessons and quizzes.
* Persist collection tokens when switching between individual and bulk import workflows for channels

### Fixed
* CSV Endpoint permissions and error handling
* Adds fix for multiple worker processes duplicating jobs.
* Adds translated string for user kind in the user table
* Check for an array's length to avoid breaking errors
* Fixes Version logic not handling non-tripartite version strings
* Filters out empty nodes, add safety to breaking code
* Prevent controls for the PDF renderer from overlapping content
* Fix quiz completion regression which caused the notification to contain the incorrect score
* height = width in import cards on thumbnail, fix misaligned text
* Update levels to display translated strings, not constant ids


## 0.15.7

### Added
* Integration test gherkin story for automatic device provisioning in https://github.com/learningequality/kolibri/pull/9587

### Fixed
* Add content check guard to library page  in https://github.com/learningequality/kolibri/pull/9635
* Resolve issues with running morango integration tests on postgres in https://github.com/learningequality/kolibri/pull/9571
* Fix headers in content summary logs by forcing unicode literals in https://github.com/learningequality/kolibri/pull/9602

### Changed
* Improve the `importcontent` `--fail-on-error` option in https://github.com/learningequality/kolibri/pull/9591


## 0.15.6

### Added
* Check node being available on filtered queryset to prevent index error. by @rtibbles in https://github.com/learningequality/kolibri/pull/9539
* Force translations in bulk export/import of user data by @jredrejo in https://github.com/learningequality/kolibri/pull/9557
* Ensure peer import and sync tasks for data and content work with servers using a prefix path by @rtibbles in https://github.com/learningequality/kolibri/pull/9533

### Changed
* Changes in 0.15.x to use kolibri with external plugins by @jredrejo in https://github.com/learningequality/kolibri/pull/9543
* Don't use multiprocessing for downloads. by @rtibbles in https://github.com/learningequality/kolibri/pull/9560

### Fixed
* Update morango and stop locking sync when db backend is postgres by @bjester in https://github.com/learningequality/kolibri/pull/9556
* Improve facility sync status reporting to users by @MisRob in https://github.com/learningequality/kolibri/pull/9541
* Fix show more of top level resources by @marcellamaki in https://github.com/learningequality/kolibri/pull/9555
* Clean up theme regressions by @rtibbles in https://github.com/learningequality/kolibri/pull/9558
* Move CACHES import into function scope to prevent side effects. by @rtibbles in https://github.com/learningequality/kolibri/pull/9561


## 0.15.5

### Overview

This release fixes a regression with quiz display for non-admins.

### Fixed
* Clean up state management for user management page in https://github.com/learningequality/kolibri/pull/9535
* Fix quiz display for non-admins in https://github.com/learningequality/kolibri/pull/9545


## 0.15.4

### Overview

This release of Kolibri includes security fixes to reduce the vulnerability of online Kolibri instances to discovery of user credentials and to sanitize exported CSV files.

Additional changes include small improvements to coach workflows in quiz and lesson workflows and fixing a regression with searching for users during class assignment.

### Added
* Restrict exclude coach for to assigned coaches only in https://github.com/learningequality/kolibri/pull/9453
* Content dir argument in https://github.com/learningequality/kolibri/pull/9463

### Changed
* Enable "continue" in quiz creation only once exercises selected in https://github.com/learningequality/kolibri/pull/9515
* Update bottom bar text in lesson resources to say save on changes in https://github.com/learningequality/kolibri/pull/9516

### Fixed
* add .trim to v-model for username in https://github.com/learningequality/kolibri/pull/9514
* API and CSV fixes in https://github.com/learningequality/kolibri/pull/9523
* Fix missing search results in coach quiz creation in https://github.com/learningequality/kolibri/pull/9522
* Fixed regression: search functionality for assigning coaches and enrolling learners in https://github.com/learningequality/kolibri/pull/#9525


## 0.15.3

### Overview of new features
The goal of this release was to make improvements to the accessibility of Kolibri and to content display. Fixes include improvements to the focus outline that appears for keyboard navigation and fixes to notifications used in screen readers, as well as small improvements to content layout.

#### Additions and Fixes: Accessibility
- Update firefox bookmarks cards focus outline https://github.com/learningequality/kolibri/pull/9409
- Update side panel focus trapping https://github.com/learningequality/kolibri/pull/9408
- Adds aria labels to immersive toolbar buttons for back and close https://github.com/learningequality/kolibri/pull/9411
- Adds aria-live=polite to the global snackbar component https://github.com/learningequality/kolibri/pull/9410
- Adjust padding for visible focus outline on bottom bar buttons in https://github.com/learningequality/kolibri/pull/9478

#### Additions and Fixes: Content Display
- Fix pagination issues for facility user page https://github.com/learningequality/kolibri/pull/9422
- Push PDF pages rendering below full screen bar https://github.com/learningequality/kolibri/pull/9439
- Fix X-Axis display for perseus graphs https://github.com/learningequality/kolibri/pull/9446
- Remove shrink ray from TopicsPage content side panel https://github.com/learningequality/kolibri/pull/9449
- Improve icon size in Cagetgory selection modal https://github.com/learningequality/kolibri/pull/8938
- Fix pagination user tables https://github.com/learningequality/kolibri/pull/9450
- Restrict exclude coach for to assigned coaches only https://github.com/learningequality/kolibri/pull/453

#### Changes
- Ensure all file handlers use utf-8 encoding https://github.com/learningequality/kolibri/pull/9401
- Upgrade morango to v0.6.13 https://github.com/learningequality/kolibri/pull/9445
- 0.14 into 0.15 https://github.com/learningequality/kolibri/pull/9447
- Upgrade KDS to v1.3.1-beta0 https://github.com/learningequality/kolibri/pull/9459


## 0.15.2

### Internationalization and localization
New language support for: Ukrainian

#### Added
* Additional gherkin scenarios https://github.com/learningequality/kolibri/pull/9130

#### Changed
* Bump morango to v0.6.10 https://github.com/learningequality/kolibri/pull/9168
* Pin windows installer to 1.5.0 https://github.com/learningequality/kolibri/pull/9200
* Pin django js asset https://github.com/learningequality/kolibri/pull/9163
* Compress HTML files for serving https://github.com/learningequality/kolibri/pull/9197
* Disable mac app pipeline by @rtibbles in https://github.com/learningequality/kolibri/pull/9257
* `SECURE_CONTENT_TYPE_NOSNIFF` set to `True` https://github.com/learningequality/kolibri/pull/9195

#### Fixed
* Content import, deletion, and `remote_content` settings fixes (#9242, #9337, #9246, #8506)
* Add check for `notification` to avoid il8n error in `CoreBase` https://github.com/learningequality/kolibri/pull/9138
* Redirect for Bookmarks when user is not logged in https://github.com/learningequality/kolibri/pull/9142
* Delete any annotated channelmetadata many to many fields to avoid integrity errors https://github.com/learningequality/kolibri/pull/9141
* Ensure deprovisioning management command deletes DMC https://github.com/learningequality/kolibri/pull/9208
* Fix Python requires to prevent install on incompatible Python versions https://github.com/learningequality/kolibri/pull/9296



## 0.15.1

### Overview of new features
The goals of this release were to fix a bug preventing proper syncing of an individual user's data across multiple devices and to made some small frontend improvements

#### Added

  - Deprecation warnings for Python 3.4 and 3.5
  - Added auto-alignment property for text display in cards, based on the language
  - Allow untranslated headers in csv imports and correct serialization into json

#### Changed

  - Updated morango to v0.6.8 to support syncing fixes
  - Bump zeroconf for fix to properly trigger service update events
  - Bump KDS version to v1.3.0
  - Updated translations to support minor translation fixes
  - Updated gherkin scenarios for new features
  - Content API: Change default ordering to combination of "lft" and "id"

#### Fixed

  - Keyboard accessibility/tab navigation focusing for searching and filtering
  - Allow for scrolling in side panel, and have side panel always take up full height of page even with 0 results
  - Small UI improvements including focus ring spacing, button alignment
  - Hide hints column in Perseus renderer when it could not be displayed to improve display on smaller screens
  - Handle no xAPI statements existing when calculating H5P and HTML5 progress
  - Don't package core node_modules dir
  - Refactor card components for consistency and comprehensibility
  - Address tech debt around KDS theming colors
  - Fixed several front end console errors
  - Ensure that we filter by subset_of_users_device on network location API



## 0.15.0
### Internationalization and localization
New language support for: Hausa, Georgian, Indonesian, Mozambican Portuguese, and Greek

### Overview of major new features
This release includes a new Learn experience featuring:
  - An updated Home page with new layout and interactions
  - A new library page featuring a better content browsing, filtering, and search experience
  - An update page for browsing individual channels, with new layout and browse/search interactions
  - A new bookmarks page and ability to bookmark content within the content renderer
  - Sync capabilities for Subset of Users Devices (SoUDs)

Selected high-level technical updates:
  - Adding API for SoUD devices, allowing them to request syncing
  - Updates to Zeroconf to support SoUD syncing
  - Updates to progress tracking
  - Consolidation of exam logging
  - Fix dataset mismatch between exams and lessons, to allow for syncing
  - Adding content metadata search, API, and fields

### Fixed
  - #8442 Segments SQLite databases to allow concurrent writes to SyncQueue and NetworkLocation models
  - #8446 Forces Learner only device sync request retries when server responds with 500+ status code
  - #8438 Fixes failure to sync FacilityUser updates when a login has occurred on a Learner only device prior to syncing
  - #8438 Fixes failure to sync all updated records when multiple learner only devices have been setup for a single FacilityUser
  - #8069 Fix backdrop not being shown while searching resources on mobile
  - #8000 Ensure progress_fraction is propagated through resource API
  - #7983 Validate usernames during sign-in flow, fix bug in facility settings page
  - #7981 Correct the component namespace in the JSON files
  - #7953 Fix non-localized numerals
  - #7951 Tasks queue cleared on server start
  - #7932 Fix DemoBanner focus
  - #8174 Fix errors from ContentNodeResource changes
  - #8162 Fix dynamic file discovering and serving on Windows
  - (#8159, #8132) Fix IE11 compatibility
  - #8199 Don't modify lessons when content is deleted
  - #8133 Prevent iterable changes size during iteration
  - #8121 Error properly on startup
  - #8103 Update values viewset implementation and pagination
  - #8102 Fix KLabeledIcon UI
  - #8101 Stop TextTruncator flash of full text before truncation

### Changed
  - #8220 Update reference to most recent Kolibri Design System
  - #8194 Update data flow docs for accuracy
  - #8088 Update DeviceSettingsPage layout. Add labels, tests
  - #7936 Change template for personal facility name to "Home facility for {name}"
  - #7928 Update memberships, roles, and permissions handling and validation
  - #8195 Use a double tap strategy to ensure against zombies
  - #8184 Bump morango version to 0.5.6
  - #8168 Use consistent "not started" icon and background color in AnswerHistory and AttemptLogList
  - #8143 Increase scrolling room for question lists in MultiPanelLayout
  - #8130 Replace migration applied check
  - #8123 Don't use KResponsiveElementMixin in all ContentCards
  - #8592 Fix quiz log syncing

### Added
  - (#8185, #8595) Add setup wizard for SoUD configuration
  - #8229 Add SoUD setup via command line
  - (#8202 , #8247 , #8329) Add UI for sync status reporting with notifications for coaches and learners
  - (#8192, #8205) Create user sync status tracking, add add permissions to model
  - (#8333, #8342, #8345, #8349, #8262) Create queue for SoUD syncing
  - #8223 Add notification generation during cleanup stage of sync
  - #8222 Add device info versioning
  - #8219 Assignment handling within single-user syncing
  - #8126 Create API for a subset of user devices to request permission to sync
  - #8122 Zeroconf broadcast of SoUD status
  - #8165 Initiate auto-syncing from zeroconf
  - #8228 Sidechannel loading of assignments
  - (#8212, #8215) Create channel-based quizzes, and corresponding gherkin scenarios
  - #8095 Add Bookmarks API
  - #8084 Allow Kolibri themes to provide a "Photo credit" for the Sign-In page background image
  - #8043 Add explicit include_coach_content filter instead of role filter
  - (#7989, #8214) Frontend only H5P Rendering and xAPI progress tracking integration
  - #7947 Open CSV file with utf-8 encoding in Py3
  - #7921 Add content tags to ContentNodeViewset
  - #7939 Add endpoint to check for duplicate username and use it to check for existing username while creating an account
  - (#8150, #8151) Add learning activity bar component, constants, and icon components
  - (#8190, #8180 ) Add support for multiple learning activities icon, and create related constants
  - #8186 Create API endpoint for Tasks backend
  - #8177 Return learning_activities and duration from contentnode endpoints
  - #8142 Add task decorators and task APIs for functions registered via decorators
  - #8138 Add Tree viewset for retrieving nested, paginated views of topic trees
  - #8136 Add new card design to AllClassesPage and ClassAssignmentPage and add base card elements
  - #8134) Update navigateTo for non-custom HTML5 Apps
  - (#8118, #8146) Add @vue-composition-api plugin, and expose through apiSpec, so it is available to all SPAs
  - #8117 Add vacuum for morango tables in Postgresql databases
  - #8367 Ensure the user will see the welcome modal after login
  - #8370 Restart zeroconf after setup
  - #8383 filter SoUD devices when scanning the network to import new facilities
  - #8385 Do not create accounts in Subset of users devices
  - #8411 Upgrade zeroconf
  - #8412 Reduce default sync retry interval
  - #8413 Reuse kolibriLogin to begin user sessions in the setup wizard
  - #8596 Add new icons
  - #8742 Allow facility forking and recreation

([Full Release Notes](https://github.com/learningequality/kolibri/releases/tag/v0.15.0))

([0.15.0 Github milestone](https://github.com/learningequality/kolibri/milestone/56?closed=1))

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
