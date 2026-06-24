<template>

  <nav>
    <AccordionContainer
      listWrapperTag="ul"
      class="unit-tree-accordion-container"
    >
      <TreeItem
        :title="preTestLabel$()"
        :description="completedLabel$()"
        :style="{
          backgroundColor: $themePalette.grey.v_100,
        }"
        :disabled="!activeTest || activeTest.testType !== TestType.PRE"
        :selected="activeTest && activeTest.testType === TestType.PRE"
      >
        <template #leading-actions>
          <KIcon
            class="item-icon"
            icon="exercise"
            :color="$themePalette.blue.v_500"
          />
        </template>
        <template #trailing-actions>
          <KIcon
            class="item-icon"
            icon="mastered"
            :color="$themeTokens.mastered"
          />
        </template>
      </TreeItem>

      <li
        v-for="lesson in lessons"
        :key="lesson.id"
      >
        <AccordionItem
          :class="{
            'current-lesson': lesson.id === currentLessonId,
          }"
          :isOpenByDefault="lesson.id === currentLessonId"
          :headerAppearanceOverrides="{
            padding: '0px 8px 0px 16px',
            height: '52px',
            color: $themeTokens.text,
            backgroundColor: $themePalette.grey.v_100,
            outlineOffset: '-3px !important',
            borderBottom: '1px solid ' + $themeTokens.fineLine,
          }"
          :contentAppearanceOverrides="{
            padding: 0,
          }"
          :style="{
            border: '0 !important',
          }"
        >
          <template #leading-actions>
            <KIcon
              icon="lesson"
              class="item-icon mr-8"
            />
          </template>
          <template #title>
            <div class="accordion-item-title">
              <KTextTruncator
                :text="lesson.title"
                :maxLines="1"
                class="title"
              />
              <div class="description">
                <span>
                  {{ getLessonRatioLabel(lesson) }}
                </span>
                <span
                  v-if="lesson.id === currentLessonId"
                  class="current-label"
                  :style="{
                    color: $themePalette.blue.v_500,
                    backgroundColor: $themePalette.blue.v_100,
                  }"
                >{{ currentLabel$() }}</span>
              </div>
            </div>
          </template>
          <template #content>
            <ul class="resource-list">
              <template v-for="resource in getResources(lesson)">
                <li
                  v-if="resource.available === false"
                  :key="resource.id"
                  class="missing-resource"
                >
                  <KIcon
                    icon="warning"
                    class="item-icon"
                    :color="$themePalette.yellow.v_600"
                  />
                  <span class="missing-resource-text">
                    {{ resourceNotFoundOnDevice$() }}
                  </span>
                </li>
                <TreeItem
                  v-else
                  :key="resource.id + '-resource'"
                  :title="resource.title"
                  class="resource-item"
                  :selected="resource.id === currentResourceId"
                  :disabled="!maxResourceLft || resource.lft > maxResourceLft"
                  @click="onResourceClick(resource)"
                >
                  <template
                    v-if="resource.duration"
                    #description
                  >
                    <TimeDuration
                      :seconds="resource.duration"
                      class="duration"
                    />
                  </template>
                  <template #leading-actions>
                    <LearningActivityIcon
                      :kind="resource.learning_activities"
                      class="item-icon"
                    />
                  </template>
                  <template #trailing-actions>
                    <div class="selected-trailing-icons">
                      <template v-if="resource.id === currentResourceId">
                        <KIconButton
                          :icon="bookmarksMap[resource.id] ? 'bookmark' : 'bookmarkEmpty'"
                          :disabled="loadingBookmarksMap[resource.id]"
                          :color="$themePalette.grey.v_400"
                          :tooltip="
                            bookmarksMap[resource.id] ? removeFromBookmarks$() : saveToBookmarks$()
                          "
                          @click.stop="toggleBookmark(resource)"
                        />
                        <KIconButton
                          v-if="
                            currentResourceProgressSessionReady &&
                              (contentNodeProgressMap[resource.content_id] || 0) < 1
                          "
                          icon="check"
                          :color="$themePalette.grey.v_400"
                          :tooltip="markAsCompleteAction$()"
                          @click.stop="onCompleteClick()"
                        />
                      </template>
                      <KIcon
                        v-if="contentNodeProgressMap[resource.content_id] === 1"
                        class="item-icon"
                        icon="mastered"
                        :color="$themeTokens.mastered"
                      />
                      <KIcon
                        v-else-if="contentNodeProgressMap[resource.content_id] > 0"
                        class="item-icon"
                        icon="inProgress"
                      />
                      <KIcon
                        v-else
                        class="item-icon"
                        icon="notStarted"
                      />
                    </div>
                  </template>
                </TreeItem>
              </template>
            </ul>
          </template>
        </AccordionItem>
      </li>

      <TreeItem
        :title="postTestLabel$()"
        :description="postTestItemDescription"
        :disabled="!activeTest || activeTest.testType !== TestType.POST"
        :style="{
          backgroundColor: $themePalette.grey.v_100,
        }"
        :selected="activeTest && activeTest.testType === TestType.POST"
      >
        <template #leading-actions>
          <KIcon
            class="item-icon"
            icon="exercise"
            :color="$themePalette.blue.v_500"
          />
        </template>
        <template #trailing-actions>
          <KIcon
            class="item-icon"
            :icon="isPostTestCompleted ? 'mastered' : 'notStarted'"
            :color="isPostTestCompleted ? $themePalette.grey.v_400 : undefined"
          />
        </template>
      </TreeItem>
    </AccordionContainer>
  </nav>

</template>


<script>

  import { computed } from 'vue';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer.vue';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem.vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import Modalities from 'kolibri-constants/Modalities';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import TimeDuration from 'kolibri-common/components/TimeDuration.vue';
  import get from 'lodash/get';
  import { injectCourseContentProgress } from '../useCourseContentProgressTracking';
  import useContentNodeProgress from '../../../composables/useContentNodeProgress';
  import useBookmarks from '../../../composables/useBookmarks';
  import { TestType } from '../../../constants';
  import TreeItem from './TreeItem.vue';

  export default {
    name: 'UnitTreeAccordion',
    components: {
      LearningActivityIcon,
      AccordionContainer,
      AccordionItem,
      TreeItem,
      TimeDuration,
    },
    setup(props, { emit }) {
      const {
        sessionReady: currentResourceProgressSessionReady,
        handleUpdateProgress: handleUpdateCurrentResourceProgress,
      } = injectCourseContentProgress();

      const { contentNodeProgressMap } = useContentNodeProgress();
      const { bookmarksMap, loadingBookmarksMap, createBookmark, removeBookmark } = useBookmarks();

      const lessons = computed(() => {
        return props.unitTree?.children?.results?.filter(
          child => child.modality === Modalities.LESSON,
        );
      });

      const { preTestLabel$, postTestLabel$, currentLabel$, markAsCompleteAction$ } =
        coursesStrings;
      const {
        completedLabel$,
        ratioLabel$,
        saveToBookmarks$,
        removeFromBookmarks$,
        resourceNotFoundOnDevice$,
      } = coreStrings;

      const isPostTestCompleted = computed(() => {
        if (props.isUnitComplete) {
          return true;
        }
        return props.activeTest?.testType === TestType.POST;
      });

      const postTestItemDescription = computed(() => {
        if (isPostTestCompleted.value) {
          return completedLabel$();
        }
        const numQuestions = get(
          props.unitTree,
          'options.completion_criteria.threshold.pre_post_test.version_a_item_ids.length',
          0,
        );
        return ratioLabel$({ number: 0, total: numQuestions });
      });

      const getLessonRatioLabel = lesson => {
        const lessonResources = lesson.children?.results || [];
        const totalResources = lessonResources.length || 0;

        let completedResources = 0;
        for (const resource of lessonResources) {
          if (contentNodeProgressMap[resource.content_id] === 1) {
            completedResources++;
          }
        }

        return ratioLabel$({ number: completedResources, total: totalResources });
      };

      const getResources = lesson => {
        return lesson.children?.results || [];
      };

      const onResourceClick = resource => {
        emit('navigateToResource', resource);
      };

      const onCompleteClick = () => {
        handleUpdateCurrentResourceProgress(1);
        emit('finished');
      };

      const toggleBookmark = resource => {
        if (bookmarksMap[resource.id]) {
          removeBookmark(resource.id);
        } else {
          createBookmark(resource.id);
        }
      };

      return {
        TestType,
        lessons,
        contentNodeProgressMap,
        bookmarksMap,
        isPostTestCompleted,
        loadingBookmarksMap,
        postTestItemDescription,
        currentResourceProgressSessionReady,
        getResources,
        getLessonRatioLabel,
        onResourceClick,
        onCompleteClick,
        toggleBookmark,

        currentLabel$,
        preTestLabel$,
        postTestLabel$,
        completedLabel$,
        saveToBookmarks$,
        removeFromBookmarks$,
        markAsCompleteAction$,
        resourceNotFoundOnDevice$,
      };
    },
    props: {
      unitTree: {
        type: Object,
        required: true,
      },
      currentResourceId: {
        type: String,
        default: null,
      },
      currentLessonId: {
        type: String,
        default: null,
      },
      /**
       * Whether the current unit is already completed. I.e., we are seeing a
       * unit previous to the current unit in the unit tree.
       */
      isUnitComplete: {
        type: Boolean,
        default: false,
      },
      activeTest: {
        type: Object,
        default: null,
      },
      /**
       * The maximum lft of the resource that can be seen in the unit tree
       */
      maxResourceLft: {
        type: Number,
        default: null,
      },
    },
  };

</script>


<style scoped lang="scss">

  .unit-tree-accordion-container {
    border: 0 !important;
  }

  .accordion-item-title {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;

    .title {
      font-size: 14px;
      line-height: 1.2;
    }

    .description {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      font-size: 12px;
    }
  }

  .current-lesson {
    .accordion-item-title {
      .title {
        font-weight: 600;
      }
    }
  }

  .item-icon {
    top: 0;
    font-size: 18px;
  }

  .mr-8 {
    margin-right: 8px;
  }

  .current-label {
    padding: 2px 5px;
    border-radius: 10px;
  }

  .missing-resource {
    display: flex;
    gap: 8px;
    align-items: center;
    height: 52px;
    padding: 12px 16px;
  }

  .missing-resource-text {
    font-size: 14px;
  }

  .resource-list {
    padding: 0;
    margin: 0;
    list-style-type: none;

    .duration {
      font-size: 12px;
    }

    .selected-trailing-icons {
      display: flex;
      gap: 4px;
      align-items: center;
    }
  }

</style>
