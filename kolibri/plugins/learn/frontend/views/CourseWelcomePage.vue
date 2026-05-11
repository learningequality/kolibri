<template>

  <ImmersivePage
    :appBarTitle="(course && course.title) || ''"
    :loading="loading"
    icon="back"
    :appBarBgColor="$themeTokens.surface"
    :appBarHoverBgColor="$themePalette.grey.v_100"
    :appearanceOverrides="{ backgroundColor: $themeTokens.surface }"
    @navIconClick="goBack"
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
          <KButton
            v-if="!actionEnabled"
            :primary="true"
            appearance="raised-button"
            style="margin-top: 20px"
            :text="actionLabel"
            :disabled="true"
            data-testid="welcome-action-button"
          />
          <KRouterLink
            v-else
            :primary="true"
            appearance="raised-button"
            style="margin-top: 20px"
            :text="actionLabel"
            :to="openCourseContentPage()"
            data-testid="welcome-action-link"
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
          <p data-testid="course-subtitle">{{ courseSubtitle }}</p>
          <SlotTruncator
            v-if="course && course.description"
            :maxHeight="90"
            :showViewMore="true"
          >
            <p dir="auto">{{ (course && course.description) || '' }}</p>
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
                    @click.stop="openCourseContentUnitTest(unit.id, TestType.PRE)"
                  >
                    <div class="unit-content">
                      <span>
                        <KIcon
                          icon="quiz"
                          :color="
                            testAvailable(unit.id, TestType.PRE) ? $themeTokens.text : lockedColor
                          "
                          class="lesson-icon unit-icons"
                        />
                        {{ preTestLabel$() }}
                      </span>
                      <span>
                        <span class="unit-item-count">{{
                          numQuestions$({ num: getUnitTestQuestionCount(unit) })
                        }}</span>
                        <KIcon
                          :icon="testAvailable(unit.id, TestType.PRE) ? 'view' : 'permissions'"
                          :color="
                            testAvailable(unit.id, TestType.PRE) ? $themeTokens.text : lockedColor
                          "
                          class="unit-icons"
                        />
                      </span>
                    </div>
                  </button>
                </li>
                <li
                  v-for="lesson in unit.children.results"
                  :key="lesson.id"
                  class="unit-item"
                >
                  <button
                    class="unit-item-button"
                    :class="
                      lessonAvailable(unit.id, lesson.id)
                        ? $computedClass(activeUnitItemStyle)
                        : $computedClass(lockedUnitItemStyle)
                    "
                    style="background-color: unset"
                    :aria-label="lesson.title"
                    :data-lesson-status="lessonStatusMap[lesson.id]"
                    :disabled="!lessonAvailable(unit.id, lesson.id)"
                    @click.stop="openCourseContentUnitLesson(unit.id, lesson.id)"
                  >
                    <div class="unit-content">
                      <span>
                        <KIcon
                          icon="lesson"
                          :color="
                            lessonAvailable(unit.id, lesson.id) ? $themeTokens.text : lockedColor
                          "
                          class="lesson-icon unit-icons"
                        />
                        {{ lesson.title }}
                      </span>
                      <span>
                        <span class="unit-item-count">{{
                          numResources$({
                            num: (lesson && lesson.on_device_resources) || 0,
                          })
                        }}</span>
                        <KIcon
                          :icon="LESSON_STATUS_ICONS[lessonStatusMap[lesson.id]]"
                          :color="
                            lessonStatusMap[lesson.id] === 'mastered'
                              ? $themeTokens.mastered
                              : lessonStatusMap[lesson.id] === 'locked'
                                ? lockedColor
                                : $themeTokens.text
                          "
                          class="unit-icons"
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
                    @click.stop="openCourseContentUnitTest(unit.id, TestType.POST)"
                  >
                    <div class="unit-content">
                      <span>
                        <KIcon
                          icon="quiz"
                          :color="
                            testAvailable(unit.id, TestType.POST) ? $themeTokens.text : lockedColor
                          "
                          class="lesson-icon unit-icons"
                        />
                        {{ postTestLabel$() }}
                      </span>
                      <span>
                        <span class="unit-item-count">{{
                          numQuestions$({ num: getUnitTestQuestionCount(unit) })
                        }}</span>
                        <KIcon
                          :icon="testAvailable(unit.id, TestType.POST) ? 'view' : 'permissions'"
                          :color="
                            testAvailable(unit.id, TestType.POST) ? $themeTokens.text : lockedColor
                          "
                          class="unit-icons"
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
  import { handleApiError } from 'kolibri/utils/appError';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import SlotTruncator from 'kolibri-common/components/SlotTruncator';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
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
      const { windowIsLarge } = useKResponsiveWindow();
      const $themePalette = themePalette();

      const {
        fetchCourse,
        getCourseContent,
        getCourseProgress,
        getCourseUnits,
        isUnitTestAvailable,
      } = useLearnerResources();
      const goBack = useGoBack({ fallbackRoute: { name: PageNames.HOME } });

      const loading = ref(true);
      const course = ref(null);

      const TestType = {
        PRE: 'pre',
        POST: 'post',
      };

      const {
        courseContentLabel$,
        numLessons$,
        numUnits$,
        numQuestions$,
        numResources$,
        preTestLabel$,
        postTestLabel$,
        startCourseAction$,
        resumeCourseAction$,
      } = coursesStrings;

      const { expandAll$, collapseAll$ } = enhancedQuizManagementStrings;

      const actionEnabled = computed(() => {
        return Boolean(courseProgress.value?.active_test || courseProgress.value?.resume_position);
      });

      const actionLabel = computed(() => {
        const progress = courseProgress.value;
        if (!progress?.started) {
          return startCourseAction$();
        }
        // `started` flips true as soon as the first pre-test becomes active,
        // so it alone mislabels the very first pre-test as "Resume". When a
        // later-unit pre-test is active, the backend wipes resume_position —
        // so the only remaining signal that an earlier pre-test was submitted
        // is an active test belonging to a non-first unit.
        const firstUnitId = units.value?.[0]?.id;
        const onFirstPreTest =
          progress.active_test?.test_type === TestType.PRE &&
          progress.active_test?.unit_id === firstUnitId &&
          !progress.resume_position;

        if (onFirstPreTest) {
          return startCourseAction$();
        }
        return resumeCourseAction$();
      });

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
          ':focus .unit-icons': {
            fill: $themePalette.blue.v_500,
          },
          ':focus-within': {
            color: $themePalette.blue.v_500,
          },
          ':hover': {
            backgroundColor: $themePalette.blue.v_100,
            color: $themePalette.blue.v_500,
          },
          ':hover .unit-icons': {
            fill: $themePalette.blue.v_500,
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
          handleApiError({ error, reloadOnReconnect: true });
        } finally {
          loading.value = false;
        }
      }

      function createCourseContentRoute(pageName, params) {
        return {
          name: pageName,
          params: {
            courseId: course.value?.id,
            ...params,
          },
        };
      }

      function openCourseContentPage() {
        const activeTest = courseProgress.value?.active_test;
        if (activeTest) {
          return createCourseContentRoute(PageNames.COURSE_CONTENT_TEST, {
            unitId: activeTest.unit_id,
            testType: activeTest.test_type,
          });
        }

        const { unit_id, lesson_id, resource_id } = courseProgress.value?.resume_position ?? {};

        if (unit_id) {
          if (lesson_id && resource_id) {
            return createCourseContentRoute(PageNames.COURSE_CONTENT__RESOURCE, {
              unitId: unit_id,
              lessonId: lesson_id,
              resourceId: resource_id,
            });
          }
          return createCourseContentRoute(PageNames.COURSE_CONTENT__UNIT, {
            unitId: unit_id,
          });
        }

        // Should be unreachable: actionEnabled gates the link to the
        // active_test or resume_position cases above. If we get here,
        // the gate is broken.
        throw new ReferenceError(
          'openCourseContentPage called without active_test or resume_position',
        );
      }

      function openCourseContentUnitTest(unitId, testType) {
        currentInstance.$router.push(
          createCourseContentRoute(PageNames.COURSE_CONTENT_TEST, { unitId, testType }),
        );
      }

      function openCourseContentUnitLesson(unitId, lessonId) {
        currentInstance.$router.push(
          createCourseContentRoute(PageNames.COURSE_CONTENT__LESSON, {
            unitId,
            lessonId,
          }),
        );
      }

      const getUnitTestQuestionCount = unit => {
        return lodashGet(
          unit,
          'options.completion_criteria.threshold.pre_post_test.version_a_item_ids.length',
          0,
        );
      };

      const courseSubtitle = computed(() => {
        if (loading.value) {
          return '';
        }
        const unitsText = numUnits$({ num: units.value?.length });
        const lessonNum = course.value.lesson_count;
        const message = unitsText + ' · ' + numLessons$({ num: lessonNum });
        return message;
      });

      function testAvailable(unitId, testType) {
        return course.value ? isUnitTestAvailable(course.value.course_id, unitId, testType) : false;
      }

      const LESSON_STATUS_ICONS = {
        mastered: 'mastered',
        open: 'view',
        locked: 'permissions',
      };

      // Classifies a lesson's display state as 'mastered', 'open'
      // (accessible, not yet complete), or 'locked'.
      function getLessonStatus(unitId, lessonId) {
        const progress = courseProgress.value;
        const unitsList = units.value;
        if (!progress?.started || !progress.resume_position?.unit_id) return 'locked';

        const resumeUnitId = progress.resume_position.unit_id;
        const resumeLessonId = progress.resume_position.lesson_id;
        const resumeUnit = unitsList.find(unit => unit.id === resumeUnitId);
        const targetUnit = unitsList.find(unit => unit.id === unitId);
        if (!resumeUnit || !targetUnit || !targetUnit.children?.results) return 'locked';

        // Target unit is strictly earlier than the resume unit.
        if (targetUnit.lft < resumeUnit.lft) return 'mastered';

        if (targetUnit.id === resumeUnitId) {
          // Unit is complete (no remaining resource).
          if (!resumeLessonId) return 'mastered';
          const lessons = targetUnit.children.results;
          const resumeLesson = lessons.find(lesson => lesson.id === resumeLessonId);
          const targetLesson = lessons.find(lesson => lesson.id === lessonId);
          if (!resumeLesson || !targetLesson) return 'locked';
          // Lessons before the resume lesson are fully done (resume_position is the earliest
          // incomplete resource in the unit).
          if (targetLesson.lft < resumeLesson.lft) return 'mastered';
          // The resume lesson itself — learner is here.
          if (targetLesson.lft === resumeLesson.lft) return 'open';
        }

        return 'locked';
      }

      // Precomputed lesson id → status map so each template render does N
      // lookups instead of N × (2 lft-compares × 4 Array.finds).
      const lessonStatusMap = computed(() => {
        if (!course.value) return {};
        const map = {};
        for (const unit of units.value) {
          for (const lesson of unit.children?.results ?? []) {
            map[lesson.id] = getLessonStatus(unit.id, lesson.id);
          }
        }
        return map;
      });

      function lessonAvailable(unitId, lessonId) {
        const status = lessonStatusMap.value[lessonId];
        return status === 'mastered' || status === 'open';
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
        actionEnabled,
        actionLabel,
        courseSubtitle,
        windowIsLarge,
        goBack,
        lockedColor,
        lockedUnitItemStyle,
        activeUnitItemStyle,

        // Methods & functions
        testAvailable,
        lessonAvailable,
        lessonStatusMap,
        LESSON_STATUS_ICONS,
        getUnitTestQuestionCount,
        openCourseContentPage,
        openCourseContentUnitTest,
        openCourseContentUnitLesson,

        // String functions
        expandAll$,
        collapseAll$,
        courseContentLabel$,
        numLessons$,
        numQuestions$,
        numResources$,
        preTestLabel$,
        postTestLabel$,
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

  .lesson-icon {
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
