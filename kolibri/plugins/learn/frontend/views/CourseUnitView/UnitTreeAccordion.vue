<template>

  <AccordionContainer listWrapperTag="ul">
    <li class="tree-item">
      <div class="item-content">
        <KIcon
          class="item-icon"
          icon="exercise"
          :color="$themePalette.blue.v_500"
        />
        <div>
          <div class="title">
            {{ preTestLabel$() }}
          </div>
          <div class="description">
            {{ completedLabel$() }}
          </div>
        </div>
      </div>
      <div class="item-actions">
        <KIcon
          class="item-icon"
          icon="mastered"
          :color="$themePalette.grey.v_400"
        />
      </div>
    </li>
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
          <div class="title">{{ lesson.title }}</div>
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
    </AccordionItem>
    <li class="tree-item">
      <div class="item-content">
        <KIcon
          class="item-icon"
          icon="exercise"
          :color="$themePalette.blue.v_500"
        />
        <div>
          <div class="title">
            {{ postTestLabel$() }}
          </div>
          <div class="description">
            {{ ratioLabel$({ number: 0, total: 5 }) }}
          </div>
        </div>
      </div>
      <div class="item-actions">
        <KIcon
          class="item-icon"
          icon="notStarted"
        />
      </div>
    </li>
  </AccordionContainer>

</template>


<script>

  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer.vue';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem.vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings.js';
  import Modalities from 'kolibri-constants/Modalities';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { computed } from 'vue';

  export default {
    name: 'UnitTreeAccordion',
    components: {
      AccordionContainer,
      AccordionItem,
    },
    setup(props) {
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

      return {
        lessons,
        getRatioLabel,

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
      currentLessonId: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style scoped lang="scss">

  .tree-item {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    height: 52px;
    padding: 12px 16px;
    /* stylelint-disable-next-line */
    border-bottom: 1px solid v-bind('$themeTokens.fineLine');

    .item-content {
      display: flex;
      gap: 8px;
      align-items: center;

      .description {
        font-size: 12px;
      }
    }
  }

  .accordion-item-title {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;

    .title {
      font-size: 14px;
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

</style>
