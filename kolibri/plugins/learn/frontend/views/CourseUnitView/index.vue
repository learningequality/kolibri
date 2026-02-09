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
    </template>
    <template #bottomBar>
      <PrevNextBar
        :currentNumber="currentResourceNumber"
        :totalNumber="totalResources"
        :progressLabel="
          resourcesProgressLabel$({ current: currentResourceNumber, total: totalResources })
        "
        @prev="handlePrev"
        @next="handleNext"
      />
    </template>
    <template #sidePanel> </template>
    <template #sidePanelFooter>
      <div class="course-side-panel-footer">
        <div></div>
        <div>
          <KIconButton icon="forward" />
        </div>
      </div>
    </template>
  </ResourceLayout>

</template>


<script>

  import store from 'kolibri/store';
  import { useRouter } from 'vue-router/composables';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource.js';
  import { computed, ref, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import Modalities from 'kolibri-constants/Modalities';
  import useFetch from 'kolibri-common/composables/useFetch.js';
  import { LearnerCourseResource } from '../../apiResources';
  import ResourceLayout from '../ResourceLayout/index.vue';
  import PrevNextBar from '../PrevNextBar/index.vue';
  import { PageNames } from '../../constants.js';

  const TestType = {
    PRE: 'pre',
    POST: 'post',
  };

  export default {
    name: 'CourseUnitView',
    components: {
      ResourceLayout,
      PrevNextBar,
    },
    setup(props) {
      const router = useRouter();

      const isPrePostTest = computed(
        () => props.unitId && [TestType.PRE, TestType.POST].includes(props.resourceId),
      );

      const currentResourceNumber = ref(5);
      const totalResources = ref(10);

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

      const course = computed(() => courseWithUnits.value?.course);
      const courseUnits = computed(() => courseWithUnits.value?.units);
      const loading = computed(() => courseWithUnitsLoading.value || unitTreeLoading.value);
      const error = computed(() => courseWithUnitsError.value || unitTreeError.value);

      const currentLessons = computed(() => {
        return unitTree.value?.children.results.filter(
          child => child.modality === Modalities.LESSON,
        );
      });

      const currentLesson = computed(() => {
        return currentLessons.value?.find(lesson => lesson.id === props.lessonId);
      });

      const currentResource = computed(() => {
        if (isPrePostTest.value) {
          // Pre/Post test content is handled differently
          return null;
        }
        return currentLesson.value?.children?.results.find(
          resource => resource.id === props.resourceId,
        );
      });

      watch(
        [unitTree, currentLesson, currentResource, courseUnits],
        ([newUnit, newLesson, newResource, newCourseUnits]) => {
          // eslint-disable-next-line
          console.log('Watching changes:', newUnit, newLesson, newResource, newCourseUnits);
        },
      );

      const checkRedirect = async () => {
        const missingParams = !props.unitId || !props.lessonId || !props.resourceId;
        if (isPrePostTest.value || !missingParams) {
          // no need to redirect
          return false;
        }
        const resumeData = await LearnerCourseResource.getResumeData(props.courseId);
        if (!resumeData.started) {
          router.replace({
            name: PageNames.HOME,
          });
          return true;
        }

        if (resumeData.active_test) {
          router.replace({
            name: PageNames.COURSE_CONTENT,
            params: {
              courseId: props.courseId,
              unitId: resumeData.active_test.unit_id,
              lessonId: null,
              resourceId: resumeData.active_test.test_type,
            },
          });
          return true;
        }

        if (resumeData.resume_position) {
          router.replace({
            name: PageNames.COURSE_CONTENT,
            params: {
              courseId: props.courseId,
              unitId: resumeData.resume_position.unit_id,
              lessonId: resumeData.resume_position.lesson_id,
              resourceId: resumeData.resume_position.resource_id,
            },
          });

          return true;
        }

        // What to do for completed courses?
        return false;
      };

      const handlePrev = () => {
        // prev handling logic
        currentResourceNumber.value = currentResourceNumber.value - 1;
      };

      const handleNext = () => {
        // next handling logic
        currentResourceNumber.value = currentResourceNumber.value + 1;
      };

      const { courseNameLabel$, resourcesProgressLabel$ } = coursesStrings;

      watch(error, (newError, oldError) => {
        if (!oldError && newError) {
          store.dispatch('handleApiError', { error: newError });
        }
      });

      watch(
        () => props.courseId,
        async () => {
          await checkRedirect();
          await fetchCourseWithUnitsData();
        },
        { immediate: true },
      );

      watch(
        () => props.unitId,
        async newUnitId => {
          if (newUnitId) {
            await fetchUnitTreeData();
          }
        },
        { immediate: true },
      );

      return {
        course,
        loading,
        totalResources,
        currentResourceNumber,
        handlePrev,
        handleNext,

        courseNameLabel$,
        resourcesProgressLabel$,
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
    },
  };

</script>


<style scoped lang="scss">

  .course-title {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;
  }

  .course-side-panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
  }

</style>
