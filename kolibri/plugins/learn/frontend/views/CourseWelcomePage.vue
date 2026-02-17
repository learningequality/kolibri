<template>

  <ImmersivePage
    :route="homePageLink"
    :appBarTitle="(course && course.title) || ''"
    :loading="loading"
    icon="back"
    :appBarBgColor="$themeTokens.surface"
    :appBarHoverBgColor="$themePalette.grey.v_100"
    :appearanceOverrides="{ backgroundColor: $themeTokens.surface }"
  >
    <KCircularLoader v-if="loading" />
    <div v-else>
      <div
        ref="header"
        class="header"
        :style="
          windowIsLarge
            ? {
              backgroundColor: $themePalette.grey.v_100,
              borderBottom: `1px solid ${$themeTokens.fineLine}`,
              padding: '24px 160px 64px',
            }
            : {
              backgroundColor: $themePalette.grey.v_100,
              borderBottom: `1px solid ${$themeTokens.fineLine}`,
              padding: isRtl ? '24px 20px 24px 0px' : '24px 0px 24px 20px',
            }
        "
      >
        <div>
          <ChannelThumbnail
            class="course-thumbnail"
            :thumbnail="(courseContent && courseContent.thumbnail) || ''"
          />
          <KRouterLink
            :primary="true"
            appearance="raised-button"
            style="margin-top: 20px"
            :text="courseStarted ? resumeCourseAction$() : startCourseAction$()"
            :to="openCourseContentPage()"
          />
        </div>
        <div>
          <h1
            class="title"
            data-testid="header-title"
          >
            <KTextTruncator
              :text="(course && course.title) || ''"
              :maxLines="2"
            />
          </h1>
          <p>{{ courseSubtitle }}</p>
          <SlotTruncator
            v-if="course && course.description"
            :maxHeight="90"
            :showViewMore="true"
          >
            <!-- eslint-disable vue/no-v-html -->
            <p
              dir="auto"
              v-html="(course && course.description) || ''"
            ></p>
            <!-- eslint-enable -->
          </SlotTruncator>
        </div>
      </div>
      <KPageContainer :style="windowIsLarge ? { padding: '24px 160px 64px' } : {}">
        <AccordionContainer
          class="course-preview"
          :headerAppearanceOverrides="{
            backgroundColor: $themeTokens.surface,
            fontWeight: 'normal',
            ['padding' + (isRtl ? 'Right' : 'Left')]: '8px',
            borderTop: '0px none',
          }"
          :style="{
            border: '0px none',
          }"
        >
          <template #header="{ expandAll, canExpandAll, collapseAll, canCollapseAll }">
            <div class="course-content-label">
              <span>{{ courseContentLabel$() }}</span>
              <span>
                <KIconButton
                  icon="expandAll"
                  :tooltip="expandAll$()"
                  :ariaLabel="expandAll$()"
                  :disabled="!canExpandAll"
                  @click="expandAll"
                />
                <KIconButton
                  icon="collapseAll"
                  :tooltip="collapseAll$()"
                  :ariaLabel="collapseAll$()"
                  :disabled="!canCollapseAll"
                  @click="collapseAll"
                />
              </span>
            </div>
          </template>
          <AccordionItem
            v-for="unit in units"
            :key="unit.id"
            :title="unit.title"
            :disabled="false"
            :foldingIconTrailing="false"
            :headerAppearanceOverrides="{
              backgroundColor: $themePalette.grey.v_100,
              fontWeight: 'normal',
              border: `1px solid ${$themeTokens.fineLine}`,
              ['padding' + (isRtl ? 'Right' : 'Left')]: '8px',
              border: '0px none',
            }"
            :contentAppearanceOverrides="{
              border: `1px solid ${$themeTokens.fineLine}`,
              padding: '0',
            }"
          >
            <template #content>
              <ul class="unit-content-list">
                <li
                  class="unit-item"
                  style="padding: 0"
                >
                  <button
                    data-testid="pre-test-button-item"
                    class="unit-item-button"
                    :class="
                      testAvailable(unit.id, TestType.PRE)
                        ? $computedClass(activeUnitItemStyle)
                        : $computedClass(lockedUnitItemStyle)
                    "
                    style="background-color: unset"
                    :aria-label="preTestLabel$()"
                    :disabled="!testAvailable(unit.id, TestType.PRE)"
                    @mouseenter="onHover(`${TestType.PRE}-${unit.id}`)"
                    @mouseleave="onLeave"
                    @focus="onFocus(`${TestType.PRE}-${unit.id}`)"
                    @blur="onBlur"
                    @click.stop="openCourseContentUnitTest(unit.id, TestType.PRE)"
                  >
                    <div class="unit-content">
                      <span>
                        <KIcon
                          icon="quiz"
                          :color="lockedColor"
                          class="resource-icon unit-icons"
                          :style="
                            testAvailable(unit.id, TestType.PRE)
                              ? [iconStyleFor(`${TestType.PRE}-${unit.id}`)]
                              : {}
                          "
                        />
                        {{ preTestLabel$() }}
                      </span>
                      <span>
                        <span class="unit-item-count">{{
                          numQuestions$({ num: getUnitTestQuestionCount(unit) })
                        }}</span>
                        <KIcon
                          :icon="testAvailable(unit.id, TestType.PRE) ? 'view' : 'permissions'"
                          :color="lockedColor"
                          class="unit-icons"
                          :style="
                            testAvailable(unit.id, TestType.PRE)
                              ? [iconStyleFor(`${TestType.PRE}-${unit.id}`)]
                              : {}
                          "
                        />
                      </span>
                    </div>
                  </button>
                </li>
                <li
                  v-for="resource in unit.children.results"
                  :key="resource.id"
                  class="unit-item"
                >
                  <button
                    class="unit-item-button"
                    :class="
                      resourceAvailable(unit.id, resource.id)
                        ? $computedClass(activeUnitItemStyle)
                        : $computedClass(lockedUnitItemStyle)
                    "
                    style="background-color: unset"
                    :aria-label="resource.title"
                    :disabled="!resourceAvailable(unit.id, resource.id)"
                    @mouseenter="onHover(resource.id)"
                    @focus="onFocus(resource.id)"
                    @mouseleave="onLeave"
                    @blur="onBlur"
                    @click.stop="
                      openCourseContentUnitResource(unit.id, resource.parent, resource.id)
                    "
                  >
                    <div class="unit-content">
                      <span>
                        <KIcon
                          icon="lesson"
                          :color="lockedColor"
                          class="resource-icon unit-icons"
                          :style="
                            resourceAvailable(unit.id, resource.id)
                              ? [iconStyleFor(resource.id)]
                              : {}
                          "
                        />
                        {{ resource.title }}
                      </span>
                      <span>
                        <span class="unit-item-count">{{
                          numberOfResources$({
                            value: (resource && resource.on_device_resources) || 0,
                          })
                        }}</span>
                        <KIcon
                          :icon="
                            isCurrentResource(unit.id, resource.id)
                              ? 'view'
                              : resourceAvailable(unit.id, resource.id)
                                ? 'mastered'
                                : 'permissions'
                          "
                          :color="lockedColor"
                          class="unit-icons"
                          :style="
                            resourceAvailable(unit.id, resource.id)
                              ? [iconStyleFor(resource.id)]
                              : {}
                          "
                        />
                      </span>
                    </div>
                  </button>
                </li>
                <li class="unit-item">
                  <button
                    class="unit-item-button"
                    :class="
                      testAvailable(unit.id, TestType.POST)
                        ? $computedClass(activeUnitItemStyle)
                        : $computedClass(lockedUnitItemStyle)
                    "
                    style="background-color: unset"
                    data-testid="post-test-button-item"
                    :aria-label="postTestLabel$()"
                    :disabled="!testAvailable(unit.id, TestType.POST)"
                    @mouseenter="onHover(`${TestType.POST}-${unit.id}`)"
                    @mouseleave="onLeave"
                    @focus="onFocus(`${TestType.POST}-${unit.id}`)"
                    @blur="onBlur"
                    @click.stop="openCourseContentUnitTest(unit.id, TestType.POST)"
                  >
                    <div class="unit-content">
                      <span>
                        <KIcon
                          icon="quiz"
                          :color="lockedColor"
                          class="resource-icon unit-icons"
                          :style="
                            testAvailable(unit.id, TestType.POST)
                              ? [iconStyleFor(`${TestType.POST}-${unit.id}`)]
                              : {}
                          "
                        />
                        {{ postTestLabel$() }}
                      </span>
                      <span>
                        <span class="unit-item-count">{{
                          numQuestions$({ num: getUnitTestQuestionCount(unit) })
                        }}</span>
                        <KIcon
                          :icon="testAvailable(unit.id, TestType.POST) ? 'view' : 'permissions'"
                          :color="lockedColor"
                          class="unit-icons"
                          :style="
                            testAvailable(unit.id, TestType.POST)
                              ? [iconStyleFor(`${TestType.POST}-${unit.id}`)]
                              : {}
                          "
                        />
                      </span>
                    </div>
                  </button>
                </li>
              </ul>
            </template>
            <template #trailing-actions>
              <span
                :style="{
                  color: $themePalette.grey.v_700,
                }"
              >
                {{ numLessons$({ num: unit.children.results.length }) }}
              </span>
            </template>
          </AccordionItem>
        </AccordionContainer>
      </KPageContainer>
    </div>
  </ImmersivePage>

</template>


<script>

  import lodashGet from 'lodash/get';
  import { ref, onMounted, getCurrentInstance, computed } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import SlotTruncator from 'kolibri-common/components/SlotTruncator';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { coachStrings } from '../../../coach/frontend/views/common/commonCoachStrings';
  import useLearnerResources from '../composables/useLearnerResources';
  import { PageNames } from '../constants';
  import ChannelThumbnail from './ChannelThumbnail.vue';

  export default {
    name: 'CourseWelcomePage',
    components: {
      ImmersivePage,
      ChannelThumbnail,
      AccordionContainer,
      AccordionItem,
      SlotTruncator,
    },
    setup(props) {
      const currentInstance = getCurrentInstance().proxy;
      const store = currentInstance.$store;
      const { windowIsLarge } = useKResponsiveWindow();

      const $themePalette = themePalette();

      const {
        fetchCourse,
        getCourseContent,
        getCourseProgress,
        getCourseUnits,
        isUnitTestAvailable,
        isCourseLessonAvailable,
        isCurrentCourseLesson,
      } = useLearnerResources();

      const loading = ref(true);
      const course = ref(null);

      // For accordion items button hover and focus state styling
      const hoveredId = ref(null);
      const focusedId = ref(null);
      const onHover = id => (hoveredId.value = id);
      const onLeave = () => (hoveredId.value = null);
      const onFocus = id => (focusedId.value = id);
      const onBlur = () => (focusedId.value = null);
      const iconStyleFor = id => {
        const active = hoveredId.value === id || focusedId.value === id;
        const color = active ? $themePalette.blue.v_500 : undefined;
        return { color, fill: color };
      };

      const TestType = {
        PRE: 'pre',
        POST: 'post',
      };

      const {
        courseContentLabel$,
        numLessons$,
        numUnits$,
        numQuestions$,
        preTestLabel$,
        postTestLabel$,
        startCourseAction$,
        resumeCourseAction$,
      } = coursesStrings;

      const { numberOfResources$ } = coachStrings;

      const { expandAll$, collapseAll$ } = enhancedQuizManagementStrings;

      const courseStarted = computed(() => courseProgress.value?.started);

      const courseContent = computed(() =>
        course.value ? getCourseContent(course.value.course_id) : null,
      );
      const courseProgress = computed(() =>
        course.value ? getCourseProgress(course.value.course_id) : null,
      );
      const units = computed(() => (course.value ? getCourseUnits(course.value.course_id) : []));

      const activeUnitItemStyle = computed(() => {
        return {
          cursor: 'pointer',
          ':focus': {
            backgroundColor: $themePalette.blue.v_100,
            borderLeft: `3px solid`,
            borderLeftColor: $themePalette.blue.v_500,
            color: $themePalette.blue.v_500,
            outline: 'unset',
          },
          ':focus-within': {
            color: $themePalette.blue.v_500,
          },
          ':hover': {
            backgroundColor: $themePalette.blue.v_100,
            color: $themePalette.blue.v_500,
          },
        };
      });

      const lockedColor = computed(() => $themePalette.grey.v_700);

      const lockedUnitItemStyle = computed(() => {
        return {
          color: $themePalette.grey.v_700,
          backgroundColor: 'unset',
          outline: 'unset',
        };
      });

      async function loadCourse() {
        try {
          loading.value = true;
          const { course: fetchedCourse } = await fetchCourse({
            courseSessionId: props.courseSessionId,
          });
          course.value = fetchedCourse;
        } catch (error) {
          currentInstance.$store.dispatch('handleApiError', {
            error,
            reloadOnReconnect: true,
          });
        } finally {
          loading.value = false;
          store.dispatch('notLoading');
        }
      }

      function createCourseContentRoute(params) {
        return {
          name: PageNames.COURSE_CONTENT,
          params: {
            courseId: course.value?.course_id,
            ...params,
          },
        };
      }

      function openCourseContentPage() {
        if (courseStarted.value) {
          const { unit_id, lesson_id, resource_id } = courseProgress.value?.resume_position ?? {};
          return createCourseContentRoute({
            unitId: unit_id,
            lessonId: lesson_id,
            resourceId: resource_id,
          });
        }

        return createCourseContentRoute({
          unitId: units.value?.[0]?.id,
          testType: TestType.PRE,
        });
      }

      function openCourseContentUnitTest(unitId, testType) {
        currentInstance.$router.push(createCourseContentRoute({ unitId, testType }));
      }

      function openCourseContentUnitResource(unitId, lessonId, resourceId) {
        currentInstance.$router.push(createCourseContentRoute({ unitId, lessonId, resourceId }));
      }

      const getUnitTestQuestionCount = unit => {
        return lodashGet(
          unit,
          'options.completion_criteria.threshold.pre_post_test.version_a_item_ids.length',
          0,
        );
      };

      const homePageLink = computed(() => {
        return {
          name: PageNames.HOME,
        };
      });

      const courseSubtitle = computed(() => {
        if (loading.value) {
          return '';
        }
        const unitsText = numUnits$({ num: units.value?.length });
        const message =
          unitsText +
          ' · ' +
          numberOfResources$({ value: courseContent.value?.on_device_resources });
        return message;
      });

      function testAvailable(unitId, testType) {
        return course.value ? isUnitTestAvailable(course.value.course_id, unitId, testType) : false;
      }

      function resourceAvailable(unitId, lessonId) {
        return course.value
          ? isCourseLessonAvailable(course.value.course_id, unitId, lessonId)
          : false;
      }

      function isCurrentResource(unitId, lessonId) {
        return course.value
          ? isCurrentCourseLesson(course.value.course_id, unitId, lessonId)
          : false;
      }

      onMounted(async () => {
        loadCourse();
      });

      return {
        // Data
        course,
        units,
        loading,
        courseContent,
        TestType,

        // Computed
        courseStarted,
        courseSubtitle,
        windowIsLarge,
        homePageLink,
        lockedColor,
        lockedUnitItemStyle,
        activeUnitItemStyle,

        // Methods & functions
        testAvailable,
        resourceAvailable,
        isCurrentResource,
        getUnitTestQuestionCount,
        onHover,
        onLeave,
        onFocus,
        onBlur,
        iconStyleFor,
        openCourseContentPage,
        openCourseContentUnitTest,
        openCourseContentUnitResource,

        // String functions
        expandAll$,
        collapseAll$,
        courseContentLabel$,
        numLessons$,
        numQuestions$,
        numberOfResources$,
        preTestLabel$,
        postTestLabel$,
        startCourseAction$,
        resumeCourseAction$,
      };
    },
    props: {
      // Route param courseSessionId
      courseSessionId: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $toolbar-height: 68px;

  .header {
    position: relative;
    top: $toolbar-height;
    display: flex;
    gap: 24px;
    width: 100%;
    height: fit-content;
    margin-bottom: 70px;
  }

  .title {
    margin: 8px 0 16px;
  }

  .course-thumbnail {
    width: 137px;
    height: 137px;
    padding: 8px 12px;
    border-radius: 8px;
  }

  .unit-content-list {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  .unit-item {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 0;
  }

  .course-content-label {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    font-weight: bold;
  }

  .unit-item-button {
    width: 100%;
    padding: 12px;
    user-select: text;
    border: 0;
    outline-offset: 0;

    .unit-content {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: space-between;
    }
  }

  .unit-icons {
    top: 5px;
    font-size: 20px;
  }

  .resource-icon {
    margin-right: 8px;
  }

  .unit-item-count {
    padding-right: 10px;
  }

  /deep/ div.show-more {
    text-align: left;
  }

  /deep/ div.overlay {
    background: transparent;
  }

</style>
