<template>

  <ImmersivePage
    :appBarTitle="waitingTitle"
    :loading="loading"
    icon="back"
    :appBarBgColor="$themeTokens.surface"
    :appBarHoverBgColor="$themePalette.grey.v_100"
    :appearanceOverrides="wrapperStyles"
    @navIconClick="goBack"
  >
    <template #default="{ pageContentHeight }">
      <KCircularLoader v-if="loading" />
      <div
        v-else-if="gatedState"
        data-testid="course-waiting-page"
        class="waiting-content"
        :style="{ minHeight: `${pageContentHeight}px` }"
      >
        <div
          class="icon-wrapper"
          :style="{ backgroundColor: $themePalette.green.v_100 }"
        >
          <KIcon
            icon="pointsActive"
            :color="$themePalette.green.v_500"
            class="waiting-icon"
          />
        </div>
        <strong>{{ waitingTitle }}</strong>
        <p>{{ waitingDescription }}</p>
      </div>
    </template>
  </ImmersivePage>

</template>


<script>

  import { computed, onMounted, getCurrentInstance, watch } from 'vue';
  import store from 'kolibri/store';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useFetch from 'kolibri-common/composables/useFetch.js';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import { LearnerCourseResource } from '../apiResources';
  import { PageNames } from '../constants';

  const GATED_STATES = {
    PRE_TEST_CLOSE: 'PRE_TEST_CLOSE',
    POST_TEST_ACTIVATION: 'POST_TEST_ACTIVATION',
    POST_TEST_CLOSE: 'POST_TEST_CLOSE',
    UNIT_COMPLETE: 'UNIT_COMPLETE',
  };

  export default {
    name: 'CourseWaitingPage',
    components: {
      ImmersivePage,
    },
    setup(props) {
      const currentInstance = getCurrentInstance().proxy;
      const router = currentInstance.$router;
      const $themePalette = themePalette();
      const $themeTokens = themeTokens();

      const wrapperStyles = {
        backgroundColor: $themeTokens.surface,
        width: '100%',
      };

      const goBack = useGoBack({ fallbackRoute: { name: PageNames.HOME } });

      const {
        preTestCompleted$,
        preTestCompletedDescription$,
        postTestNotOpenYet$,
        postTestNotOpenYetDescription$,
        postTestCompleted$,
        postTestCompletedDescription$,
        unitComplete$,
        unitCompleteDescription$,
      } = coursesStrings;

      const STATE_STRINGS = {
        [GATED_STATES.PRE_TEST_CLOSE]: {
          title: preTestCompleted$,
          description: preTestCompletedDescription$,
        },
        [GATED_STATES.POST_TEST_ACTIVATION]: {
          title: postTestNotOpenYet$,
          description: postTestNotOpenYetDescription$,
        },
        [GATED_STATES.POST_TEST_CLOSE]: {
          title: postTestCompleted$,
          description: postTestCompletedDescription$,
        },
        [GATED_STATES.UNIT_COMPLETE]: {
          title: unitComplete$,
          description: unitCompleteDescription$,
        },
      };

      const {
        data: resumeData,
        loading,
        fetchData: fetchResumeData,
      } = useFetch({
        fetchMethod: () => LearnerCourseResource.getResumeData(props.courseId),
      });

      const gatedState = computed(() => {
        if (!resumeData.value) {
          return null;
        }
        const { active_test, resume_position } = resumeData.value;

        if (active_test && resume_position) {
          return active_test.test_type === 'pre'
            ? GATED_STATES.PRE_TEST_CLOSE
            : GATED_STATES.POST_TEST_CLOSE;
        }
        if (!active_test && resume_position && !resume_position.lesson_id) {
          return GATED_STATES.POST_TEST_ACTIVATION;
        }
        return null;
      });

      const waitingTitle = computed(() =>
        gatedState.value ? STATE_STRINGS[gatedState.value].title() : '',
      );
      const waitingDescription = computed(() =>
        gatedState.value ? STATE_STRINGS[gatedState.value].description() : '',
      );

      // When not gated, redirect to the appropriate page
      watch(
        [gatedState, loading],
        () => {
          if (loading.value || gatedState.value) {
            return;
          }
          if (!resumeData.value) {
            return;
          }
          const { active_test, resume_position, started } = resumeData.value;

          if (!started) {
            router.replace({ name: PageNames.COURSE_WELCOME });
            return;
          }
          if (active_test && !resume_position) {
            router.replace({
              name: PageNames.COURSE_CONTENT_TEST,
              params: {
                courseId: props.courseId,
                unitId: active_test.unit_id,
                testType: active_test.test_type,
              },
            });
            return;
          }
          if (resume_position && resume_position.lesson_id && resume_position.resource_id) {
            router.replace({
              name: PageNames.COURSE_CONTENT__RESOURCE,
              params: {
                courseId: props.courseId,
                unitId: resume_position.unit_id,
                lessonId: resume_position.lesson_id,
                resourceId: resume_position.resource_id,
              },
            });
            return;
          }
          router.replace({ name: PageNames.COURSE_WELCOME });
        },
        { immediate: true },
      );

      onMounted(() => {
        store.dispatch('notLoading');
        fetchResumeData();
      });

      return {
        loading,
        gatedState,
        waitingTitle,
        waitingDescription,
        wrapperStyles,
        goBack,
        $themePalette,
      };
    },
    props: {
      courseId: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .waiting-content {
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

  .waiting-icon {
    width: 40px;
    height: 40px;
  }

</style>
