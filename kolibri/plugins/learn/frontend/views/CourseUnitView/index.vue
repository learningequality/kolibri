<template>

  <ResourceLayout ref="resourceLayoutRef">
    <template #topBar>
      <div
        class="course-title"
        data-testid="course-title"
      >
        <KIconButton
          icon="back"
          data-testid="course-back-button"
          @click="goBack"
        />
        <h1>
          <KTextTruncator
            :maxLines="1"
            :text="pageTitle"
          />
        </h1>
      </div>
    </template>
    <template #default>
      <KCircularLoader
        v-if="loading"
        disableDefaultTransition
      />
      <CourseInterstitial
        v-else-if="showInterstitial"
        :title="interstitialTitle"
        :description="interstitialDescription"
        :data-testid="interstitialTestId"
      />
      <CourseContentViewer
        v-else-if="contentNodeToRender"
        :contentNode="contentNodeToRender"
        :nextResource="nextAvailableResource"
        :previousResource="previousAvailableResource"
        @next="handleNext"
        @prev="handlePrev"
        @finished="onResourceFinished"
      />
    </template>
    <template
      v-if="currentResource || showInterstitial"
      #bottomBar
    >
      <PrevNextBar
        class="course-bottom-bar"
        :progressLabel="prevNextLabel"
        :prevEnabled="prevEnabled"
        :nextEnabled="nextEnabled"
        :style="{
          backgroundColor: $themeTokens.surface,
          borderTop: `1px solid ${$themeTokens.fineLine}`,
        }"
        @prev="handlePrev"
        @next="handleNext"
      />
    </template>
    <template #sidePanelTopBar>
      <div class="side-panel-top-bar">
        <span class="unit-number">
          {{ unitNumberLabel }}
        </span>
        <strong class="unit-title">
          <KTextTruncator
            :maxLines="1"
            :text="unitTree ? unitTree.title : ''"
          />
        </strong>
      </div>
    </template>
    <template #sidePanel>
      <UnitTreeAccordion
        v-if="unitTree"
        :maxResourceLft="maxResourceLft"
        :unitTree="unitTree"
        :activeTest="activeTest"
        :currentResourceId="currentResource && currentResource.id"
        :currentLessonId="currentLesson && currentLesson.id"
        :isUnitComplete="isUnitComplete"
        @finished="onResourceFinished"
        @navigateToResource="handleNavigateToResource"
      />
    </template>
    <template
      v-if="nextUnit"
      #sidePanelFooter
    >
      <UpNextNavigationFooter
        :label="upNextLabel$()"
        :nextNode="nextUnit"
        :nextEnabled="canGoToNextUnit"
        @next="goToNextUnit"
      />
    </template>
  </ResourceLayout>

</template>


<script>

  import { handleApiError } from 'kolibri/utils/appError';
  import { useRouter } from 'vue-router/composables';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource.js';
  import { computed, nextTick, ref, toRef, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import Modalities from 'kolibri-constants/Modalities';
  import useFetch from 'kolibri-common/composables/useFetch.js';
  import { injectPreviousRoute } from 'kolibri-common/composables/usePreviousRoute';
  import { LearnerCourseResource } from '../../apiResources';
  import ResourceLayout from '../ResourceLayout/index.vue';
  import PrevNextBar from '../PrevNextBar/index.vue';
  import { PageNames } from '../../constants.js';
  import useContentNodeProgress from '../../composables/useContentNodeProgress.js';
  import useBookmarks from '../../composables/useBookmarks.js';
  import CourseContentViewer from './CourseContentViewer.vue';
  import CourseInterstitial from './CourseInterstitial.vue';
  import UnitTreeAccordion from './UnitTreeAccordion/index.vue';
  import useCourseContentProgress from './useCourseContentProgressTracking';
  import UpNextNavigationFooter from './UpNextNavigationFooter.vue';

  const InterstitialContext = Object.freeze({
    TEST_COMPLETED: 'test_completed',
    UNIT_COMPLETED: 'unit_completed',
  });

  export default {
    name: 'CourseUnitView',
    components: {
      ResourceLayout,
      PrevNextBar,
      CourseContentViewer,
      CourseInterstitial,
      UnitTreeAccordion,
      UpNextNavigationFooter,
    },
    setup(props) {
      const router = useRouter();
      const resourceLayoutRef = ref(null);
      const showInterstitial = ref(false);
      const interstitialContext = ref(null);

      // Captured once on mount: true when the learner landed here from the
      // course welcome page this session. Internal unit-view navigation uses
      // router.replace (see handleNext/Prev/NavigateToResource) so the
      // welcome entry stays exactly one step back in history for the entire
      // unit-view session. Used by goBack to decide whether to pop that
      // entry (back) or synthesize a welcome entry (replace) for deep links.
      const previousRoute = injectPreviousRoute();
      const cameFromWelcome = ref(previousRoute?.value?.name === PageNames.COURSE_WELCOME);

      const fetchCourseWithUnits = async () => {
        const courseData = await LearnerCourseResource.fetchModel({
          id: props.courseId,
        });
        const unitsData = await ContentNodeResource.fetchCollection({
          getParams: {
            parent: courseData.course_id,
            modality: Modalities.UNIT,
          },
        });
        return {
          course: courseData,
          units: unitsData,
        };
      };

      const {
        data: courseWithUnits,
        loading: courseWithUnitsLoading,
        error: courseWithUnitsError,
        fetchData: fetchCourseWithUnitsData,
      } = useFetch({
        fetchMethod: fetchCourseWithUnits,
      });

      const {
        data: _unitTree,
        loading: unitTreeLoading,
        error: unitTreeError,
        fetchData: fetchUnitTreeData,
      } = useFetch({
        fetchMethod: () =>
          ContentNodeResource.fetchTree({
            id: props.unitId,
            // Include unavailable nodes so missing resources show a
            // warning in the navigation panel instead of disappearing.
            params: { no_available_filtering: true },
          }),
      });

      const unitTree = computed(() => {
        if (!_unitTree.value) {
          return null;
        }
        // Ensure that the unit tree data is the expected unit
        if (_unitTree.value.id !== props.unitId) {
          return null;
        }
        return _unitTree.value;
      });

      const {
        data: resumeData,
        loading: resumeDataLoading,
        error: resumeDataError,
        fetchData: fetchResumeData,
      } = useFetch({
        fetchMethod: () => LearnerCourseResource.getResumeData(props.courseId),
      });

      const course = computed(() => courseWithUnits.value?.course);
      const courseUnits = computed(() => courseWithUnits.value?.units);
      const loading = computed(
        () => courseWithUnitsLoading.value || unitTreeLoading.value || resumeDataLoading.value,
      );
      const error = computed(
        () => courseWithUnitsError.value || unitTreeError.value || resumeDataError.value,
      );

      const currentUnitIndex = computed(() => {
        const index = courseUnits.value?.findIndex(unit => unit.id === props.unitId);
        if (index >= 0) {
          return index;
        }
        // Shouldn't get here
        return null;
      });

      const nextUnit = computed(() => {
        if (
          currentUnitIndex.value === null ||
          currentUnitIndex.value === courseUnits.value.length - 1
        ) {
          return null;
        }
        return courseUnits.value[currentUnitIndex.value + 1];
      });

      const isUnitComplete = computed(() => {
        if (!resumeData.value || !resumeData.value.started) {
          // no data to make a decision
          return false;
        }
        // If current unit is different, it means that it is a previoius unit,
        if (resumeData.value.active_test) {
          return resumeData.value.active_test.unit_id !== props.unitId;
        }
        if (resumeData.value.resume_position) {
          return resumeData.value.resume_position.unit_id !== props.unitId;
        }
        // If no resume_position, it means the course is complete,
        return true;
      });

      const canGoToNextUnit = computed(() => {
        if (!nextUnit.value || activeTest.value) {
          return false;
        }
        return props.unitId !== resumeData.value?.resume_position?.unit_id;
      });

      const currentLessons = computed(() => {
        return unitTree.value?.children.results.filter(
          child => child.modality === Modalities.LESSON,
        );
      });

      const unitResources = computed(() => {
        const resources = [];
        for (const lesson of currentLessons.value || []) {
          resources.push(...(lesson.children.results || []));
        }
        return resources;
      });

      const currentLesson = computed(() => {
        return currentLessons.value?.find(lesson => lesson.id === props.lessonId);
      });

      const currentResourceIndexInUnit = computed(() => {
        const index = unitResources.value?.findIndex(resource => resource.id === props.resourceId);
        if (index >= 0) {
          return index;
        }
        // Shouldn't get here
        return null;
      });

      const maxResourceLft = computed(() => {
        if (!unitResources.value || !resumeData.value) {
          // No data, can't make a decision
          return null;
        }
        if (!resumeData.value.started) {
          // Course not started — all resources blocked. Defense-in-depth:
          // checkRedirect normally redirects to COURSE_WELCOME before this
          // is reached, but the guard prevents the side panel from briefly
          // showing all resources as accessible during the redirect tick.
          return null;
        }
        if (resumeData.value.active_test) {
          // when active test, can't navigate to other resources
          return null;
        }
        if (resumeData.value.resume_position) {
          const { unit_id: resumeUnitId, resource_id: resumeResourceId } =
            resumeData.value.resume_position;
          if (!resumeResourceId || props.unitId !== resumeUnitId) {
            // If the unit is different, it must be a previous unit, so we allow
            // navigation to any resource. If not resumeResourceId, it means that
            // the learner has completed all their resources in the unit.
            return Number.MAX_SAFE_INTEGER;
          }
          const resumeResource = unitResources.value.find(
            resource => resource.id === resumeResourceId,
          );
          if (resumeResource) {
            return resumeResource.lft;
          } else {
            // If the resume resource is not found, let's allow navigation to any resource
            return Number.MAX_SAFE_INTEGER;
          }
        }
        // completed courses can navigate to any resource
        return Number.MAX_SAFE_INTEGER;
      });

      const prevEnabled = computed(() => {
        if (showInterstitial.value) {
          // During an active test, only the test is accessible — nothing to go back to.
          // After unit completion, the learner can go back to review the last resource.
          return (
            interstitialContext.value === InterstitialContext.UNIT_COMPLETED &&
            unitResources.value?.length > 0
          );
        }
        if (activeTest.value) {
          return false;
        }
        return currentResourceIndexInUnit.value > 0;
      });

      const nextEnabled = computed(() => {
        if (showInterstitial.value) {
          return false;
        }
        if (
          activeTest.value ||
          currentResourceIndexInUnit.value === null ||
          maxResourceLft.value === null
        ) {
          return false;
        }
        if (currentResourceIndexInUnit.value >= unitResources.value.length - 1) {
          return false;
        }
        const currentResource = unitResources.value[currentResourceIndexInUnit.value];
        return currentResource.lft < maxResourceLft.value;
      });

      const nextAvailableResource = computed(() => {
        if (!nextEnabled.value) {
          return null;
        }
        return unitResources.value[currentResourceIndexInUnit.value + 1];
      });

      const previousAvailableResource = computed(() => {
        if (!prevEnabled.value) {
          return null;
        }
        return unitResources.value[currentResourceIndexInUnit.value - 1];
      });

      const currentLessonResources = computed(() => {
        return currentLesson.value?.children?.results || [];
      });

      const currentResourceIndexInLesson = computed(() => {
        const index = currentLessonResources.value?.findIndex(
          resource => resource.id === props.resourceId,
        );
        if (index >= 0) {
          return index;
        }
        return null;
      });

      const currentResource = computed(() => {
        return currentLesson.value?.children.results.find(
          resource => resource.id === props.resourceId,
        );
      });

      const pageTitle = computed(() => {
        if (activeTest.value) {
          const testStringsMap = {
            pre: preTestTitle$,
            post: postTestTitle$,
          };
          if (unitTree.value) {
            return testStringsMap[props.testType]?.({
              unitNumber: currentUnitIndex.value + 1,
              unitTitle: unitTree.value.title,
            });
          }
        }
        if (currentResource.value?.title) {
          return currentResource.value.title;
        }
        // Resource not loaded, or something happened
        if (course.value) {
          return courseNameLabel$({ name: course.value.title });
        }
        return '';
      });

      const getNextIncompleteResource = () => {
        for (
          let idx = currentResourceIndexInUnit.value + 1;
          idx < unitResources.value.length;
          idx++
        ) {
          const resource = unitResources.value[idx];
          const resourceProgress = contentNodeProgressMap[resource.content_id] || 0;
          if (resourceProgress < 1) {
            return resource;
          }
        }
        return null;
      };

      const onResourceFinished = () => {
        if (activeTest.value) {
          showInterstitial.value = true;
          interstitialContext.value = InterstitialContext.TEST_COMPLETED;
          return;
        }
        if (
          !resumeData.value?.resume_position ||
          // If finished resource is not the current resource in resume position
          // it means, this event is from a previous resource, so no need to update
          resumeData.value.resume_position.resource_id !== props.resourceId ||
          !unitResources.value
        ) {
          return;
        }

        const nextResource = getNextIncompleteResource();
        if (!nextResource) {
          // No more resources in the unit, no need to update, null
          // lesson_id and resource_id to represent that there is no resource to resume within the
          // unit, so all resources appear as completed
          resumeData.value = {
            ...resumeData.value,
            resume_position: {
              unit_id: props.unitId,
            },
          };
          showInterstitial.value = true;
          interstitialContext.value = InterstitialContext.UNIT_COMPLETED;
          return;
        }

        // Update resume position to allow navigation to the next resource
        resumeData.value = {
          ...resumeData.value,
          resume_position: {
            unit_id: props.unitId,
            lesson_id: nextResource.parent,
            resource_id: nextResource.id,
          },
        };
      };

      const checkValidPosition = (current, expected, data) => {
        if (!data) {
          // no data to make a decision
          return true;
        }
        const currentIndex = data.findIndex(item => item.id === current);
        const expectedIndex = data.findIndex(item => item.id === expected);
        if (currentIndex < 0 || expectedIndex < 0 || currentIndex > expectedIndex) {
          // invalid or ahead of the expected position, redirect to a valid position
          return false;
        }
        return true;
      };

      /**
       * Redirect to a valid position if the current unit is previous to the resume
       * position unit, or if resume position doesn't have where to resume within
       * the unit.
       * @returns {boolean} True if a redirect was issued, false otherwise.
       * @throws {Error} If no resource can be found to redirect to when one is required.
       */
      const checkRedirectToUnitTree = () => {
        if (
          props.unitId === resumeData.value?.resume_position?.unit_id &&
          resumeData.value?.resume_position?.lesson_id &&
          props.lessonId === resumeData.value?.resume_position?.lesson_id &&
          resumeData.value?.resume_position?.resource_id &&
          props.resourceId === resumeData.value?.resume_position?.resource_id
        ) {
          // already on the right unit, no need to redirect
          return false;
        }

        if (!unitTree.value) {
          // no data to make a decision
          return false;
        }

        if (!props.lessonId || !props.resourceId) {
          // Missing props, look for a resource to redirect to
          let resourceToRedirect = null;
          if (props.lessonId) {
            // lesson is specified, redirect to the first resource of the lesson
            resourceToRedirect = currentLessonResources.value?.[0];
          }

          if (!resourceToRedirect) {
            // no resource specified, redirect to the first resource of the unit
            [resourceToRedirect] = unitResources.value;
          }

          if (!resourceToRedirect) {
            // should not get here
            throw new Error('No resource found to redirect to');
          }

          router.replace({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: {
              courseId: props.courseId,
              unitId: props.unitId,
              lessonId: resourceToRedirect.parent,
              resourceId: resourceToRedirect.id,
            },
          });
          return true;
        }

        return false;
      };

      const redirectToResumePosition = () => {
        const {
          unit_id: resumeUnitId,
          lesson_id: resumeLessonId,
          resource_id: resumeResourceId,
        } = resumeData.value.resume_position;

        if (resumeUnitId && resumeLessonId && resumeResourceId) {
          // redirect to the resume position
          router.replace({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: {
              courseId: props.courseId,
              unitId: resumeUnitId,
              lessonId: resumeLessonId,
              resourceId: resumeResourceId,
            },
          });
          return true;
        }

        if (resumeUnitId) {
          if (unitResources.value) {
            const firstResourceOfUnit = unitResources.value[0];
            if (firstResourceOfUnit) {
              router.replace({
                name: PageNames.COURSE_CONTENT__RESOURCE,
                params: {
                  courseId: props.courseId,
                  unitId: resumeUnitId,
                  lessonId: firstResourceOfUnit.parent,
                  resourceId: firstResourceOfUnit.id,
                },
              });
              return true;
            }
          }
          // If not, it means that unitTree is not loaded, redirect to the unit, and
          // wait until next check redirect
          router.replace({
            name: PageNames.COURSE_CONTENT__UNIT,
            params: {
              courseId: props.courseId,
              unitId: resumeUnitId,
            },
          });
          return true;
        }
        // Shouldn't get here
        return false;
      };

      /**
       * If we need to redirect to resume_position, it is because the current route
       * is invalid or is currently on the resume position.
       * @returns {boolean} True if the route should be redirected to the resume position.
       */
      const shouldRedirectToResumePosition = () => {
        if (!props.unitId) {
          // no data, redirect
          return true;
        }

        if (
          !checkValidPosition(
            props.unitId,
            resumeData.value?.resume_position?.unit_id,
            courseUnits.value,
          )
        ) {
          return true;
        }

        if (
          !resumeData.value?.resume_position?.lesson_id ||
          !resumeData.value?.resume_position?.resource_id
        ) {
          // Unit complete, learner can navigate freely within the unit, no need to redirect
          return false;
        }

        if (props.unitId !== resumeData.value?.resume_position?.unit_id) {
          // Here, we can ensure that `props.unitId` is a previous unit, it shouldn't get
          // redirected to resume position, because learners can navigate freely
          // within completed units
          return false;
        }

        if (
          props.unitId === resumeData.value?.resume_position?.unit_id &&
          props.lessonId === resumeData.value?.resume_position?.lesson_id &&
          props.resourceId === resumeData.value?.resume_position?.resource_id
        ) {
          // already at the resume position, no need to redirect
          return false;
        }

        if (
          // If only unitId is present, but lessonId is not defined, redirect to resume position
          !checkValidPosition(
            props.lessonId,
            resumeData.value?.resume_position?.lesson_id,
            currentLessons.value,
          )
        ) {
          return true;
        }

        if (
          // If unitId and lessonId are present, but resourceId is not defined do not redirect to
          // resume position, but leave it to checkRedirectToUnitTree to decide where to redirect
          props.resourceId &&
          // If resourceId is present, but is not valid according to the resume position, redirect
          // to resume position
          !checkValidPosition(
            props.resourceId,
            resumeData.value?.resume_position?.resource_id,
            unitResources.value,
          )
        ) {
          return true;
        }

        if (unitTree.value) {
          // data has loaded, if props are present, computed properties should be defined,
          // if not, it means that props are invalid and we should redirect to resume position
          if (props.lessonId && !currentLesson.value) {
            return true;
          }
          if (props.resourceId && !currentResource.value) {
            return true;
          }
        }

        return false;
      };

      const checkRedirect = async () => {
        if (!resumeData.value) {
          await fetchResumeData();
        }
        await nextTick();
        if (!resumeData.value) {
          // no data to make a decision
          return false;
        }
        if (!resumeData.value.started) {
          // Course not started — always redirect to the welcome page,
          // even when a unitId is present (deep links / bookmarks must
          // not bypass the pre-test gate).
          router.replace({
            name: PageNames.COURSE_WELCOME,
            params: { courseSessionId: props.courseId },
          });
          return true;
        }

        if (resumeData.value.active_test) {
          if (
            resumeData.value.active_test.unit_id === props.unitId &&
            resumeData.value.active_test.test_type === props.testType
          ) {
            // already on the right page, no need to redirect
            return false;
          }

          router.replace({
            name: PageNames.COURSE_CONTENT_TEST,
            params: {
              courseId: props.courseId,
              unitId: resumeData.value.active_test.unit_id,
              testType: resumeData.value.active_test.test_type,
            },
          });
          return true;
        }

        if (resumeData.value.resume_position) {
          if (shouldRedirectToResumePosition()) {
            return redirectToResumePosition();
          }
          return checkRedirectToUnitTree();
        }

        return false;
      };

      const onSidePanelNavigation = () => {
        if (resourceLayoutRef.value) {
          resourceLayoutRef.value.onSidePanelNavigation();
        }
      };

      const handlePrev = () => {
        if (!prevEnabled.value) {
          return;
        }
        if (showInterstitial.value) {
          // Navigate to the last AVAILABLE resource in the unit. The tree is
          // fetched with no_available_filtering=true so unitResources may
          // include unavailable nodes that cannot be displayed.
          const availableResources = unitResources.value.filter(r => r.available !== false);
          const lastResource = availableResources[availableResources.length - 1];
          if (!lastResource) {
            return;
          }
          showInterstitial.value = false;
          interstitialContext.value = null;
          router.replace({
            name: PageNames.COURSE_CONTENT__RESOURCE,
            params: {
              courseId: props.courseId,
              unitId: props.unitId,
              lessonId: lastResource.parent,
              resourceId: lastResource.id,
            },
          });
          onSidePanelNavigation();
          return;
        }
        const newResourceIndex = currentResourceIndexInUnit.value - 1;
        const newResource = unitResources.value[newResourceIndex];
        router.replace({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: props.courseId,
            unitId: props.unitId,
            lessonId: newResource.parent,
            resourceId: newResource.id,
          },
        });
        onSidePanelNavigation();
      };

      const handleNext = () => {
        if (!nextEnabled.value) {
          return;
        }
        const newResourceIndex = currentResourceIndexInUnit.value + 1;
        const newResource = unitResources.value[newResourceIndex];
        router.replace({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: props.courseId,
            unitId: props.unitId,
            lessonId: newResource.parent,
            resourceId: newResource.id,
          },
        });
        onSidePanelNavigation();
      };

      const handleNavigateToResource = resource => {
        router.replace({
          name: PageNames.COURSE_CONTENT__RESOURCE,
          params: {
            courseId: props.courseId,
            unitId: props.unitId,
            resourceId: resource.id,
            lessonId: resource.parent,
          },
        });
        onSidePanelNavigation();
      };

      // When the learner arrived from the welcome page, pop that history
      // entry so subsequent browser-back presses exit the course cleanly.
      // Replacing with welcome in that case would duplicate the entry and
      // force the learner to click back multiple times to escape the course.
      //
      // For deep-link entries (bookmarks, tab reopen) welcome isn't on the
      // stack yet, so replace the current route — matches the prior
      // behavior where browser-back from welcome lands wherever the learner
      // came from rather than on the resource they were just viewing.
      const goBack = () => {
        if (cameFromWelcome.value) {
          router.back();
          return;
        }
        router.replace({
          name: PageNames.COURSE_WELCOME,
          params: { courseSessionId: props.courseId },
        });
      };

      const goToNextUnit = () => {
        if (!canGoToNextUnit.value) {
          return;
        }
        router.replace({
          name: PageNames.COURSE_CONTENT__UNIT,
          params: {
            courseId: props.courseId,
            unitId: nextUnit.value.id,
          },
        });
        onSidePanelNavigation();
      };

      const {
        courseNameLabel$,
        resourcesProgressLabel$,
        unitNumberLabel$,
        upNextLabel$,
        preTestTitle$,
        postTestTitle$,
        preTestCompleted$,
        postTestCompleted$,
        preTestCompletedDescription$,
        postTestCompletedDescription$,
        unitCompleted$,
        unitCompletedDescription$,
      } = coursesStrings;

      const unitNumberLabel = computed(() => {
        if (loading.value) {
          return '';
        }
        return unitNumberLabel$({ number: currentUnitIndex.value + 1 });
      });

      const prevNextLabel = computed(() => {
        if (showInterstitial.value) {
          return '';
        }
        return resourcesProgressLabel$({
          current: currentResourceIndexInLesson.value + 1,
          total: currentLessonResources.value.length,
        });
      });

      const interstitialTitle = computed(() => {
        if (interstitialContext.value === InterstitialContext.TEST_COMPLETED) {
          return activeTest.value?.testType === 'post' ? postTestCompleted$() : preTestCompleted$();
        }
        if (interstitialContext.value === InterstitialContext.UNIT_COMPLETED) {
          return unitCompleted$();
        }
        return '';
      });

      const interstitialDescription = computed(() => {
        if (interstitialContext.value === InterstitialContext.TEST_COMPLETED) {
          return activeTest.value?.testType === 'post'
            ? postTestCompletedDescription$()
            : preTestCompletedDescription$();
        }
        if (interstitialContext.value === InterstitialContext.UNIT_COMPLETED) {
          return unitCompletedDescription$();
        }
        return '';
      });

      const interstitialTestId = computed(() => {
        if (interstitialContext.value === InterstitialContext.TEST_COMPLETED) {
          return 'test-completed-interstitial';
        }
        if (interstitialContext.value === InterstitialContext.UNIT_COMPLETED) {
          return 'unit-completed-interstitial';
        }
        return null;
      });

      // Clear interstitial when resume data updates with a navigable position
      // (e.g. coach closes the test and learner can proceed)
      watch(resumeData, newData => {
        if (
          showInterstitial.value &&
          newData?.resume_position?.lesson_id &&
          newData?.resume_position?.resource_id
        ) {
          showInterstitial.value = false;
          interstitialContext.value = null;
        }
      });

      const activeTest = computed(() => {
        if (!props.testType || !props.unitId) {
          return null;
        }
        return {
          unitId: props.unitId,
          testType: props.testType,
        };
      });

      const contentNodeToRender = computed(() => {
        if (activeTest.value) {
          return unitTree.value;
        }
        return currentResource.value;
      });

      // Provide progress tracking to child components
      useCourseContentProgress({
        contentNode: currentResource,
        // route courseId refers to courseSessionId
        courseSessionId: toRef(props, 'courseId'),
        activeTest,
      });

      const { contentNodeProgressMap, fetchContentNodeProgress } = useContentNodeProgress();
      const { fetchBookmarks } = useBookmarks();

      watch(error, (newError, oldError) => {
        if (!oldError && newError) {
          handleApiError({ error: newError });
        }
      });

      watch(
        () => props.courseId,
        async () => {
          await fetchCourseWithUnitsData();
          checkRedirect();
        },
        { immediate: true },
      );

      watch(
        () => props.unitId,
        async newUnitId => {
          if (newUnitId) {
            await fetchUnitTreeData();
            await nextTick();
            await checkRedirect();
            fetchContentNodeProgress({
              descendant_of: newUnitId,
            });
            fetchBookmarks({
              descendant_of: newUnitId,
            });
          }
        },
        { immediate: true },
      );

      watch([() => props.lessonId, () => props.resourceId, () => props.testType], () => {
        checkRedirect();
      });

      return {
        loading,
        unitTree,
        nextUnit,
        pageTitle,
        canGoToNextUnit,
        currentLesson,
        currentResource,
        contentNodeToRender,
        prevNextLabel,
        unitNumberLabel,
        prevEnabled,
        nextEnabled,
        nextAvailableResource,
        previousAvailableResource,
        maxResourceLft,
        resourceLayoutRef,
        isUnitComplete,
        activeTest,
        showInterstitial,
        interstitialTitle,
        interstitialDescription,
        interstitialTestId,
        handlePrev,
        handleNext,
        onResourceFinished,
        goToNextUnit,
        handleNavigateToResource,
        goBack,

        upNextLabel$,
      };
    },
    props: {
      courseId: {
        type: String,
        required: true,
      },
      unitId: {
        type: String,
        default: null,
      },
      lessonId: {
        type: String,
        default: null,
      },
      resourceId: {
        type: String,
        default: null,
      },
      testType: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style scoped lang="scss">

  .course-title {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;
    line-height: 1.2;

    h1 {
      min-width: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .side-panel-top-bar {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .unit-title {
      font-size: 14px;
      line-height: 1.3;
    }

    .unit-number {
      font-size: 12px;
    }
  }

  .course-bottom-bar {
    height: 56px;
  }

</style>
