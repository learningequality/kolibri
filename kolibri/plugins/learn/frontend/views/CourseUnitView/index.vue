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
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import { computed, ref, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import Modalities from 'kolibri-constants/Modalities';
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
      const course = ref(null);
      const unitTree = ref(null);
      const loading = ref(true);
      const router = useRouter();

      const isPrePostTest = computed(
        () => props.unitId && [TestType.PRE, TestType.POST].includes(props.resourceId),
      );

      const currentResourceNumber = ref(5);
      const totalResources = ref(10);

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

      watch([unitTree, currentLesson, currentResource], ([newUnit, newLesson, newResource]) => {
        // eslint-disable-next-line
        console.log('Watching changes:', newUnit, newLesson, newResource);
        // Additional logic can be added here if needed when unit or lesson changes
      });

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

      const loadData = async () => {
        try {
          loading.value = true;

          const redirected = await checkRedirect();
          if (redirected) {
            return;
          }

          course.value = await LearnerCourseResource.fetchModel({
            id: props.courseId,
          });

          unitTree.value = await ContentNodeResource.fetchTree({
            id: props.unitId,
          });
        } catch (error) {
          store.dispatch('handleApiError', error);
        } finally {
          loading.value = false;
        }
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

      loadData();

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
