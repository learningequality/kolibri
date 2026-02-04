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
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import { computed, ref, watch } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import { LearnerCourseResource } from '../../apiResources';
  import ResourceLayout from '../ResourceLayout/index.vue';
  import PrevNextBar from '../PrevNextBar/index.vue';

  export default {
    name: 'CourseUnitView',
    components: {
      ResourceLayout,
      PrevNextBar,
    },
    setup(props) {
      const course = ref(null);
      const courseTree = ref(null);
      const loading = ref(true);

      const currentResourceNumber = ref(5);
      const totalResources = ref(10);

      const units = computed(() => {
        return courseTree.value?.children.results || [];
      });

      const currentUnit = computed(() => {
        if (props.unitId) {
          return units.value?.find(unit => unit.id === props.unitId);
        }
        return units.value?.[0];
      });

      const currentLessons = computed(() => {
        return currentUnit.value?.children.results || [];
      });

      const currentLesson = computed(() => {
        if (props.lessonId) {
          return currentLessons.value?.find(lesson => lesson.id === props.lessonId);
        }
        return currentLessons.value?.[0];
      });

      const currentResource = computed(() => {
        if (props.resourceId) {
          return currentLesson.value?.children?.results.find(
            resource => resource.id === props.resourceId,
          );
        }
        return currentLesson.value?.children?.results[0];
      });

      watch([currentUnit, currentLesson, currentResource], ([newUnit, newLesson, newResource]) => {
        // eslint-disable-next-line
        console.log('Watching changes:', newUnit, newLesson, newResource);
        // Additional logic can be added here if needed when unit or lesson changes
      });

      const loadData = async () => {
        try {
          loading.value = true;
          course.value = await LearnerCourseResource.fetchModel({
            id: props.courseId,
          });

          const courseContentNode = course.value.course_id;
          courseTree.value = await ContentNodeResource.fetchTree({
            id: courseContentNode,
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
