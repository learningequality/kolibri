<template>

  <ResourceLayout ref="resourceLayoutRef">
    <template #topBar>
      <div class="course-title">
        <KIconButton
          icon="back"
          @click="$router.back()"
        />
        <KTextTruncator
          :maxLines="1"
          :text="courseNameLabel$({ name: course ? course.title : '' })"
        />
      </div>
    </template>
    <template #default>
      <KCircularLoader
        v-if="loading"
        disableDefaultTransition
      />
      <div
        v-else-if="showInterstitial"
        data-testid="gated-interstitial"
        class="interstitial-content"
      >
        <div
          class="icon-wrapper"
          :style="{ backgroundColor: $themePalette.green.v_100 }"
        >
          <KIcon
            icon="pointsActive"
            :color="$themePalette.green.v_500"
            class="interstitial-icon"
          />
        </div>
        <strong data-testid="interstitial-title">{{ interstitialTitle }}</strong>
        <p data-testid="interstitial-description">{{ interstitialDescription }}</p>
      </div>
      <CourseContentViewer
        v-else-if="contentNodeToRender"
        :contentNode="contentNodeToRender"
        :nextResource="nextAvailableResource"
        :previousResource="previousAvailableResource"
        @next="handleNext"
        @prev="handlePrev"
        @finished="onResourceFinished"
        @completed="onTestCompleted"
      />
    </template>
    <template
      v-if="currentResource || showInterstitial"
      #bottomBar
    >
      <PrevNextBar
        class="course-bottom-bar"
        :progressLabel="showInterstitial ? '' : prevNextLabel"
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

  import store from 'kolibri/store';
  import { useRouter } from 'vue-router/composables';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource.js';
  import { computed, nextTick, ref, toRef, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import Modalities from 'kolibri-constants/Modalities';
  import useFetch from 'kolibri-common/composables/useFetch.js';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { LearnerCourseResource } from '../../apiResources';
  import ResourceLayout from '../ResourceLayout/index.vue';
  import PrevNextBar from '../PrevNextBar/index.vue';
  import { GatingState, PageNames } from '../../constants.js';
  import useContentNodeProgress from '../../composables/useContentNodeProgress.js';
  import useBookmarks from '../../composables/useBookmarks.js';
  import CourseContentViewer from './CourseContentViewer.vue';
  import UnitTreeAccordion from './UnitTreeAccordion/index.vue';
  import useCourseContentProgress from './useCourseContentProgressTracking';
  import UpNextNavigationFooter from './UpNextNavigationFooter.vue';

  export default {
    name: 'CourseUnitView',
    components: {
      ResourceLayout,
      PrevNextBar,
      CourseContentViewer,
      UnitTreeAccordion,
      UpNextNavigationFooter,
    },
    setup(props) {
      const router = useRouter();
      const resourceLayoutRef = ref(null);
      const showInterstitial = ref(false);
      const $themePalette = themePalette();

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
        const state = resumeData.value?.gating_state;
        if (!state) {
          return false;
        }
        // The current unit is complete if viewing a previous unit (resume is ahead)
        // or if gating_state indicates completion
        if (state === GatingState.COURSE_COMPLETE) {
          return true;
        }
        if (state === GatingState.UNIT_COMPLETE) {
          return resumeData.value?.resume_position?.unit_id === props.unitId;
        }
        // If resume is on a later unit, current unit is a completed previous unit
        if (resumeData.value?.resume_position?.unit_id) {
          return resumeData.value.resume_position.unit_id !== props.unitId;
        }
        if (resumeData.value?.active_test) {
          return resumeData.value.active_test.unit_id !== props.unitId;
        }
        return false;
      });

      const canGoToNextUnit = computed(() => {
        if (!nextUnit.value || activeTest.value) {
          return false;
        }
        const state = resumeData.value?.gating_state;
        // Can go to next unit only if current unit is complete and course isn't done
        return (
          state === GatingState.UNIT_COMPLETE &&
          resumeData.value?.resume_position?.unit_id === props.unitId
        );
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
          return null;
        }
        const state = resumeData.value.gating_state;

        // States where all resources are locked
        if (
          state === GatingState.NOT_STARTED ||
          state === GatingState.PRE_TEST_ACTIVE_INCOMPLETE ||
          state === GatingState.PRE_TEST_ACTIVE_COMPLETE ||
          state === GatingState.POST_TEST_ACTIVE_INCOMPLETE ||
          state === GatingState.POST_TEST_ACTIVE_COMPLETE
        ) {
          return null;
        }

        // RESOURCE_PROGRESSION — allow up to resume resource
        if (state === GatingState.RESOURCE_PROGRESSION && resumeData.value.resume_position) {
          const resumeResourceId = resumeData.value.resume_position.resource_id;
          if (!resumeResourceId || props.unitId !== resumeData.value.resume_position.unit_id) {
            return Number.MAX_SAFE_INTEGER;
          }
          const resumeResource = unitResources.value.find(
            resource => resource.id === resumeResourceId,
          );
          return resumeResource ? resumeResource.lft : Number.MAX_SAFE_INTEGER;
        }

        // All other states — resources are freely navigable
        return Number.MAX_SAFE_INTEGER;
      });

      const prevEnabled = computed(() => {
        if (showInterstitial.value) {
          const state = resumeData.value?.gating_state;
          // Post-test and pre-test completion states lock ALL resources — no Previous
          if (
            state === GatingState.POST_TEST_ACTIVE_COMPLETE ||
            state === GatingState.PRE_TEST_ACTIVE_COMPLETE
          ) {
            return false;
          }
          return true;
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
        if (activeTest.value || currentResourceIndexInUnit.value === null) {
          return false;
        }
        if (currentResourceIndexInUnit.value >= unitResources.value.length - 1) {
          // Last resource — Next enabled when resource is locally complete
          // or when backend state indicates all resources are done.
          const res = unitResources.value[currentResourceIndexInUnit.value];
          const locallyComplete = (contentNodeProgressMap[res.content_id] || 0) >= 1;
          const state = resumeData.value?.gating_state;
          const backendComplete =
            state === GatingState.RESOURCES_COMPLETE_POST_TEST_INACTIVE ||
            state === GatingState.UNIT_COMPLETE ||
            state === GatingState.COURSE_COMPLETE;
          return locallyComplete || backendComplete;
        }
        const currentResource = unitResources.value[currentResourceIndexInUnit.value];
        // Current resource is locally complete — learner can advance.
        // This is needed because resumeData.resume_position isn't mutated
        // locally on completion, so maxResourceLft may still point at
        // the current resource (lft < lft would be false).
        if ((contentNodeProgressMap[currentResource.content_id] || 0) >= 1) {
          return true;
        }
        if (maxResourceLft.value === null) {
          return false;
        }
        return currentResource.lft < maxResourceLft.value;
      });

      const nextAvailableResource = computed(() => {
        if (!nextEnabled.value) {
          return null;
        }
        const next = unitResources.value[currentResourceIndexInUnit.value + 1];
        if (next) {
          return next;
        }
        // On the last resource with nextEnabled — "Next" will show the interstitial.
        // Return the current resource as a sentinel so content viewers (e.g.
        // AssessmentWrapper) show their "Next" button.
        return unitResources.value[currentResourceIndexInUnit.value] || null;
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

      const onResourceFinished = () => {
        if (activeTest.value) {
          return;
        }
        if (
          !resumeData.value?.resume_position ||
          resumeData.value.resume_position.resource_id !== props.resourceId ||
          !unitResources.value
        ) {
          return;
        }

        // Advance the local resume position so maxResourceLft updates and
        // nextEnabled becomes true. This is a navigation position update
        // within RESOURCE_PROGRESSION, not a gating state change.
        const currentIndex = currentResourceIndexInUnit.value;
        if (currentIndex === null) {
          return;
        }
        const nextResource = unitResources.value[currentIndex + 1];
        if (!nextResource) {
          // Last resource — mark unit resources as complete
          resumeData.value = {
            ...resumeData.value,
            resume_position: {
              unit_id: props.unitId,
            },
          };
          return;
        }
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
       * Redirect to a valid position if the current unit is previous to the resume position unit
       * or if resume position doesn't have where to resume within the unit
       */
      const checkRedirectToUnitTree = () => {
        if (!unitTree.value) {
          return false;
        }
        if (props.lessonId && props.resourceId) {
          // Already on a specific resource
          if (
            props.unitId === resumeData.value?.resume_position?.unit_id &&
            props.lessonId === resumeData.value?.resume_position?.lesson_id &&
            props.resourceId === resumeData.value?.resume_position?.resource_id
          ) {
            return false;
          }
        }
        if (!props.lessonId || !props.resourceId) {
          let resourceToRedirect = null;
          if (props.lessonId) {
            resourceToRedirect = currentLessonResources.value?.[0];
          }
          if (!resourceToRedirect) {
            const state = resumeData.value?.gating_state;
            if (
              state === GatingState.RESOURCES_COMPLETE_POST_TEST_INACTIVE &&
              unitResources.value?.length
            ) {
              resourceToRedirect = unitResources.value[unitResources.value.length - 1];
            } else {
              [resourceToRedirect] = unitResources.value || [];
            }
          }
          if (!resourceToRedirect) {
            return false;
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
          return false;
        }
        const state = resumeData.value.gating_state;

        // NOT_STARTED — go to welcome page
        if (state === GatingState.NOT_STARTED) {
          router.replace({
            name: PageNames.COURSE_WELCOME,
            params: { courseSessionId: props.courseId },
          });
          return true;
        }

        // Active test, learner hasn't completed → redirect to test
        if (
          state === GatingState.PRE_TEST_ACTIVE_INCOMPLETE ||
          state === GatingState.POST_TEST_ACTIVE_INCOMPLETE
        ) {
          const { unit_id, test_type } = resumeData.value.active_test;
          if (props.unitId === unit_id && props.testType === test_type) {
            return false;
          }
          router.replace({
            name: PageNames.COURSE_CONTENT_TEST,
            params: { courseId: props.courseId, unitId: unit_id, testType: test_type },
          });
          return true;
        }

        // Gated states — show interstitial (unless viewing a specific resource)
        if (
          state === GatingState.PRE_TEST_ACTIVE_COMPLETE ||
          state === GatingState.POST_TEST_ACTIVE_COMPLETE ||
          state === GatingState.UNIT_COMPLETE ||
          state === GatingState.COURSE_COMPLETE
        ) {
          // Viewing a specific resource from a previous unit — let them
          if (props.resourceId) {
            return false;
          }
          showInterstitial.value = true;
          return false;
        }

        // RESOURCES_COMPLETE_POST_TEST_INACTIVE — redirect to last resource,
        // interstitial shows on "Next"
        if (state === GatingState.RESOURCES_COMPLETE_POST_TEST_INACTIVE) {
          if (props.resourceId) {
            return false;
          }
          // If on a different unit than the resume unit, redirect to the resume unit
          const resumeUnitId = resumeData.value.resume_position?.unit_id;
          if (resumeUnitId && props.unitId !== resumeUnitId && !props.lessonId) {
            router.replace({
              name: PageNames.COURSE_CONTENT__UNIT,
              params: { courseId: props.courseId, unitId: resumeUnitId },
            });
            return true;
          }
          return checkRedirectToUnitTree();
        }

        // RESOURCE_PROGRESSION — validate position and redirect if needed
        if (state === GatingState.RESOURCE_PROGRESSION) {
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
          showInterstitial.value = false;
          // Navigate to the last resource so the content viewer renders.
          // When the interstitial was shown after a test, the route may not
          // have a resourceId, so just hiding the interstitial would leave
          // nothing rendered.
          const lastResource = unitResources.value[unitResources.value.length - 1];
          if (lastResource) {
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
          }
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

      const handleNext = async () => {
        if (!nextEnabled.value) {
          return;
        }
        // Last resource — state boundary, re-fetch from server.
        // fetchResumeData sets resumeDataLoading which propagates through
        // the loading computed, so no manual loading assignment needed.
        if (currentResourceIndexInUnit.value >= unitResources.value.length - 1) {
          await fetchResumeData();
          showInterstitial.value = true;
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
        showInterstitial.value = false;
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

      const onTestCompleted = async () => {
        await fetchResumeData();
        showInterstitial.value = true;
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
        preTestCompleted$,
        preTestCompletedDescription$,
        postTestNotOpenYet$,
        postTestNotOpenYetDescription$,
        postTestCompleted$,
        postTestCompletedDescription$,
        unitComplete$,
        unitCompleteDescription$,
        courseComplete$,
        courseCompleteDescription$,
      } = coursesStrings;

      const GATING_STRINGS = {
        [GatingState.PRE_TEST_ACTIVE_COMPLETE]: {
          title: preTestCompleted$,
          description: preTestCompletedDescription$,
        },
        [GatingState.RESOURCES_COMPLETE_POST_TEST_INACTIVE]: {
          title: postTestNotOpenYet$,
          description: postTestNotOpenYetDescription$,
        },
        [GatingState.POST_TEST_ACTIVE_COMPLETE]: {
          title: postTestCompleted$,
          description: postTestCompletedDescription$,
        },
        [GatingState.UNIT_COMPLETE]: {
          title: unitComplete$,
          description: unitCompleteDescription$,
        },
        [GatingState.COURSE_COMPLETE]: {
          title: courseComplete$,
          description: courseCompleteDescription$,
        },
      };

      const interstitialTitle = computed(() => {
        const state = resumeData.value?.gating_state;
        return state && GATING_STRINGS[state] ? GATING_STRINGS[state].title() : '';
      });
      const interstitialDescription = computed(() => {
        const state = resumeData.value?.gating_state;
        return state && GATING_STRINGS[state] ? GATING_STRINGS[state].description() : '';
      });

      const unitNumberLabel = computed(() => {
        if (loading.value) {
          return '';
        }
        return unitNumberLabel$({ number: currentUnitIndex.value + 1 });
      });

      const prevNextLabel = computed(() =>
        resourcesProgressLabel$({
          current: currentResourceIndexInLesson.value + 1,
          total: currentLessonResources.value.length,
        }),
      );

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
          store.dispatch('handleApiError', { error: newError });
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
        course,
        loading,
        unitTree,
        nextUnit,
        canGoToNextUnit,
        currentLesson,
        currentResource,
        contentNodeToRender,
        showInterstitial,
        interstitialTitle,
        interstitialDescription,
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
        handlePrev,
        handleNext,
        onResourceFinished,
        onTestCompleted,
        goToNextUnit,
        handleNavigateToResource,
        $themePalette,

        upNextLabel$,
        courseNameLabel$,
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

  .interstitial-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin-bottom: 16px;
    border-radius: 50%;
  }

  .interstitial-icon {
    width: 40px;
    height: 40px;
  }

</style>
