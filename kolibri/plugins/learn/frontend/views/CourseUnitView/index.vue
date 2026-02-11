<template>

  <ResourceLayout>
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
      <CourseContentViewer
        v-else-if="currentResource && !currentResource.assessmentmetadata"
        :contentNode="currentResource"
        @finished="onResourceFinished"
      />
    </template>
    <template
      v-if="currentResource"
      #bottomBar
    >
      <PrevNextBar
        class="course-bottom-bar"
        :progressLabel="prevNextLabel"
        :prevEnabled="prevEnabled"
        :nextEnabled="nextEnabled"
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
        :currentResourceId="currentResource && currentResource.id"
        :currentLessonId="currentLesson && currentLesson.id"
        @finished="onResourceFinished"
      />
    </template>
    <template
      v-if="nextUnit"
      #sidePanelFooter
    >
      <div class="course-side-panel-footer">
        <div class="up-next-wrapper">
          <span class="up-next-label">
            {{ upNextLabel$() }}
          </span>
          <span class="up-next-title">
            <KTextTruncator
              :text="nextUnit.title"
              :maxLines="1"
            />
          </span>
        </div>
        <div>
          <KIconButton
            v-if="canGoToNextUnit"
            icon="forward"
            @click="goToNextUnit"
          />
          <KIconButton
            v-else
            icon="permissions"
            disabled
          />
        </div>
      </div>
    </template>
  </ResourceLayout>

</template>


<script>

  import store from 'kolibri/store';
  import { useRouter } from 'vue-router/composables';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource.js';
  import { computed, nextTick, toRef, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import Modalities from 'kolibri-constants/Modalities';
  import useFetch from 'kolibri-common/composables/useFetch.js';
  import { LearnerCourseResource } from '../../apiResources';
  import ResourceLayout from '../ResourceLayout/index.vue';
  import PrevNextBar from '../PrevNextBar/index.vue';
  import { PageNames } from '../../constants.js';
  import CourseContentViewer from './CourseContentViewer.vue';
  import UnitTreeAccordion from './UnitTreeAccordion/index.vue';
  import useCourseContentProgress from './useCourseContentProgressTracking';

  export default {
    name: 'CourseUnitView',
    components: {
      ResourceLayout,
      PrevNextBar,
      CourseContentViewer,
      UnitTreeAccordion,
    },
    setup(props) {
      const router = useRouter();

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
        data: unitTree,
        loading: unitTreeLoading,
        error: unitTreeError,
        fetchData: fetchUnitTreeData,
      } = useFetch({
        fetchMethod: () =>
          ContentNodeResource.fetchTree({
            id: props.unitId,
          }),
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

      const canGoToNextUnit = computed(() => {
        if (!nextUnit.value) {
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
        if (resumeData.value.active_test) {
          // when active test, can't navigate to other resources
          return null;
        }
        if (resumeData.value.resume_position) {
          const { unit_id: resumeUnitId, resource_id: resumeResourceId } =
            resumeData.value.resume_position;
          if (props.unitId === resumeUnitId) {
            const resumeResource = unitResources.value.find(
              resource => resource.id === resumeResourceId,
            );
            if (resumeResource) {
              return resumeResource.lft;
            } else {
              // If the resume resource is not found, let's allow navigation to any resource
              return Number.MAX_SAFE_INTEGER;
            }
          } else {
            // If the unit is different, it must be a previous unit, so we allow
            // navigation to any resource
            return Number.MAX_SAFE_INTEGER;
          }
        }
        // completed courses can navigate to any resource
        return Number.MAX_SAFE_INTEGER;
      });

      const prevEnabled = computed(() => currentResourceIndexInUnit.value > 0);

      const nextEnabled = computed(() => {
        if (currentResourceIndexInUnit.value === null || maxResourceLft.value === null) {
          return false;
        }
        if (currentResourceIndexInUnit.value >= unitResources.value.length - 1) {
          return false;
        }
        const currentResource = unitResources.value[currentResourceIndexInUnit.value];
        return currentResource.lft < maxResourceLft.value;
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
        // Shouldn't get here
        return null;
      });

      const currentResource = computed(() => {
        return currentLesson.value?.children.results.find(
          resource => resource.id === props.resourceId,
        );
      });

      const onResourceFinished = () => {
        if (
          !resumeData.value?.resume_position ||
          // If finished resource is not the current resource in resume position
          // it means, this event is from a previous resource, so no need to update
          resumeData.value.resume_position.resource_id !== props.resourceId ||
          !unitResources.value
        ) {
          return;
        }
        const nextResourceIndex = currentResourceIndexInUnit.value + 1;
        if (nextResourceIndex >= unitResources.value.length) {
          // No more resources in the unit, no need to update, null
          // resume_position to represent that there is no resource to resume within the
          // unit, so all resources appear as completed
          resumeData.value = {
            ...resumeData.value,
            resume_position: null,
          };
          return;
        }

        const nextResource = unitResources.value[nextResourceIndex];
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
       * Redirect to a valid position if the current unit is previous to the resume position unit
       */
      const checkRedirectToUnitTree = () => {
        if (props.unitId === resumeData.value?.resume_position?.unit_id) {
          // already on the right unit, no need to redirect
          return false;
        }
        if (!unitResources.value) {
          // no data to make a decision
          return false;
        }
        const missingProps = !props.lessonId || !props.resourceId;

        // no resource or lesson belongs to the unit
        const invalidProps = !currentResource.value || !currentLesson.value;

        if (missingProps || invalidProps) {
          // no resource specified, redirect to the first resource of the unit
          const [resource] = unitResources.value;
          if (resource) {
            router.replace({
              name: PageNames.COURSE_CONTENT__RESOURCE,
              params: {
                courseId: props.courseId,
                unitId: props.unitId,
                lessonId: resource.parent,
                resourceId: resource.id,
              },
            });
            return true;
          }
          return false;
        }
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
            const lastResourceOfUnit = unitResources.value[unitResources.value.length - 1];
            if (lastResourceOfUnit) {
              router.replace({
                name: PageNames.COURSE_CONTENT__RESOURCE,
                params: {
                  courseId: props.courseId,
                  unitId: resumeUnitId,
                  lessonId: lastResourceOfUnit.parent,
                  resourceId: lastResourceOfUnit.id,
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
          !checkValidPosition(
            props.lessonId,
            resumeData.value?.resume_position?.lesson_id,
            currentLessons.value,
          )
        ) {
          return true;
        }

        if (
          !checkValidPosition(
            props.resourceId,
            resumeData.value?.resume_position?.resource_id,
            unitResources.value,
          )
        ) {
          return true;
        }

        if (unitTree.value && (!currentResource.value || !currentLesson.value)) {
          // either the lesson doesn't belong to the unit or the resource doesn't belong to the
          // lesson, redirect to a valid position
          return true;
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
          router.replace({
            name: PageNames.HOME,
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

      const handlePrev = () => {
        if (!prevEnabled.value) {
          return;
        }
        const newResourceIndex = currentResourceIndexInUnit.value - 1;
        const newResource = unitResources.value[newResourceIndex];
        router.replace({
          name: PageNames.COURSE_CONTENT,
          params: {
            courseId: props.courseId,
            unitId: props.unitId,
            lessonId: newResource.parent,
            resourceId: newResource.id,
          },
        });
      };

      const handleNext = () => {
        if (!nextEnabled.value) {
          return;
        }
        const newResourceIndex = currentResourceIndexInUnit.value + 1;
        const newResource = unitResources.value[newResourceIndex];
        router.replace({
          name: PageNames.COURSE_CONTENT,
          params: {
            courseId: props.courseId,
            unitId: props.unitId,
            lessonId: newResource.parent,
            resourceId: newResource.id,
          },
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
      };

      const { courseNameLabel$, resourcesProgressLabel$, unitNumberLabel$, upNextLabel$ } =
        coursesStrings;

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

      watch(error, (newError, oldError) => {
        if (!oldError && newError) {
          store.dispatch('handleApiError', { error: newError });
        }
      });

      watch(
        () => props.courseId,
        async () => {
          fetchCourseWithUnitsData();
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
          }
        },
        { immediate: true },
      );

      watch([() => props.lessonId, () => props.resourceId, () => props.testType], () => {
        checkRedirect();
      });

      // Provide progress tracking to child components
      useCourseContentProgress({
        contentNode: currentResource,
        courseSessionId: toRef(props, 'courseId'),
      });

      return {
        course,
        loading,
        unitTree,
        nextUnit,
        canGoToNextUnit,
        currentLesson,
        currentResource,
        prevNextLabel,
        unitNumberLabel,
        prevEnabled,
        nextEnabled,
        maxResourceLft,
        handlePrev,
        handleNext,
        onResourceFinished,
        goToNextUnit,

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

  .course-side-panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 8px 8px 16px;

    .up-next-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      .up-next-label {
        font-size: 12px;
      }

      .up-next-title {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
      }
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
    /* stylelint-disable-next-line */
    background-color: v-bind('$themeTokens.surface');
    /* stylelint-disable-next-line */
    border-top: 1px solid v-bind('$themeTokens.fineLine');
  }

</style>
