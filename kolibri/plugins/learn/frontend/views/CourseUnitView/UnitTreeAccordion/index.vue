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
            :color="$themePalette.grey.v_400"
          />
        </template>
      </TreeItem>

      <AccordionItem
        v-for="lesson in lessons"
        :key="lesson.id"
        wrapperTag="li"
        :class="{
          'current-lesson': lesson.id === currentLessonId,
        }"
        :headerAppearanceOverrides="{
          padding: '0px 8px 0px 16px',
          height: '52px',
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
                {{ getRatioLabel(lesson) }}
              </span>
              <span
                v-if="lesson.id === currentLessonId"
                class="current-label"
              >{{ currentLabel$() }}</span>
            </div>
          </div>
        </template>
        <template #content>
          <ul class="resource-list">
            <TreeItem
              v-for="resource in getResources(lesson)"
              :key="resource.id"
              :title="resource.title"
              class="resource-item"
              :selected="resource.id === currentResourceId"
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
                <div
                  v-if="resource.id === currentResourceId"
                  class="selected-trailing-icons"
                >
                  <!-- Todo, implement these buttons -->
                  <KIconButton icon="bookmarkEmpty" />
                  <KIconButton icon="check" />
                  <KIcon
                    class="item-icon"
                    icon="inProgress"
                  />
                </div>
                <KIcon
                  v-else
                  class="item-icon"
                  icon="notStarted"
                />
              </template>
            </TreeItem>
          </ul>
        </template>
      </AccordionItem>

      <TreeItem
        :title="postTestLabel$()"
        :description="ratioLabel$({ number: 0, total: 5 })"
        :style="{
          backgroundColor: $themePalette.grey.v_100,
        }"
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
            icon="notStarted"
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
  import { useRoute, useRouter } from 'vue-router/composables';
  import TimeDuration from 'kolibri-common/components/TimeDuration.vue';
  import { PageNames } from '../../../constants';
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
    setup(props) {
      const router = useRouter();
      const route = useRoute();

      const lessons = computed(() => {
        return props.unitTree?.children?.results?.filter(
          child => child.modality === Modalities.LESSON,
        );
      });

      const { preTestLabel$, postTestLabel$, currentLabel$ } = coursesStrings;
      const { completedLabel$, ratioLabel$ } = coreStrings;

      const getRatioLabel = lesson => {
        const totalResources = lesson.children?.results?.length || 0;

        return ratioLabel$({ number: 0, total: totalResources });
      };

      const getResources = lesson => {
        return lesson.children?.results || [];
      };

      const onResourceClick = resource => {
        router.replace({
          name: PageNames.COURSE_CONTENT,
          params: {
            ...route.params,
            resourceId: resource.id,
            lessonId: resource.parent,
          },
        });
      };

      return {
        lessons,
        getResources,
        getRatioLabel,
        onResourceClick,

        ratioLabel$,
        currentLabel$,
        preTestLabel$,
        postTestLabel$,
        completedLabel$,
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
    /* stylelint-disable-next-line */
    color: v-bind('$themePalette.blue.v_500');
    /* stylelint-disable-next-line */
    background-color: v-bind('$themePalette.blue.v_100');
    border-radius: 10px;
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
