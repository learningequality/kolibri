<template>

  <div class="section-settings-content">
    <h5
      class="section-settings-top-heading"
      :style="{ color: $themeTokens.text }"
    >
      {{ sectionSettings$() }}
    </h5>

    <KGrid>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 2 }"
      >
        <KTextbox
          v-model="sectionTitle"
          :label="sectionTitle$()"
          :maxlength="100"
        />
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 2 }"
      >
        <div class="number-question">
          <div>
            <KTextbox
              ref="numQuest"
              v-model="numberOfQuestions"
              type="number"
              :label="numberOfQuestionsLabel$()"
            />
          </div>
          <div>
            <div
              :style="borderStyle"
              class="group-button-border"
            >
              <KIconButton
                icon="minus"
                aria-hidden="true"
                class="number-btn"
                :disabled="numberOfQuestions === 1"
                @click="numberOfQuestions -= 1"
              />
              <span
                :style="dividerStyle"
              > | </span>
              <KIconButton
                icon="plus"
                aria-hidden="true"
                class="number-btn"
                @click="numberOfQuestions += 1"
              />
            </div>
          </div>
        </div>
      </KGridItem>
    </KGrid>

    <KTextbox
      v-model="descriptionText"
      :label="optionalDescriptionLabel$()"
      :maxlength="400"
      :textArea="true"
      class="description-ktextbox-style"
    />

    <hr :style="dividerStyle">

    <div>
      <h5
        class="section-settings-heading"
      >
        {{ questionOrder$() }}
      </h5>
      <KGrid>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KRadioButton
            v-model="selectedQuestionOrder"
            :label="randomizedLabel$()"
            :value="true"
            :description="randomizedOptionDescription$()"
          />
        </KGridItem>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KRadioButton
            v-model="selectedQuestionOrder"
            :label="fixedLabel$()"
            :value="false"
            :description="fixedOptionDescription$()"
          />
        </KGridItem>
      </KGrid>
    </div>

    <hr :style="dividerStyle">

    <h5
      class="section-settings-heading"
    >
      {{ quizResourceSelection$() }}
    </h5>
    <p>{{ numberOfSelectedResources$({ count: 4 }) }}</p>

    <KRouterLink
      appearance="raised-button"
      :to="{ path: 'select-resources' }"
      class="change-resource-button-style"
      iconAfter="forward"
    >
      {{ changeResources$() }}
    </KRouterLink>

    <hr :style="dividerStyle">

    <h5
      class="section-order-style section-settings-heading"
    >
      {{ sectionOrder$() }}
    </h5>


    <DragContainer
      v-if="sectionOrderList.length > 0"
      :items="sectionOrderList"
      @sort="handleSectionSort"
    >
      <transition-group>
        <Draggable
          v-for="(section) in sectionOrderList"
          :key="section.section_id"
          :style="draggableStyle"
        >
          <DragHandle>
            <div
              :style="section.isActive ? activeSectionStyles : borderStyle "
              class="section-order-list"
            >
              <KGrid>
                <KGridItem
                  :layout12="{ span: 1 }"
                  :layout8="{ span: 1 }"
                >
                  <KIcon
                    icon="dragVertical"
                    class="space-content"
                  />
                </KGridItem>

                <KGridItem
                  :layout12="{ span: 6 }"
                  :layout8="{ span: 5 }"
                >
                  <p class="space-content">
                    {{ section.section_title.toUpperCase() }}
                  </p>
                </KGridItem>

                <KGridItem
                  :layout12="{ span: 5 }"
                  :layout8="{ span: 2 }"
                  class="current-section-style"
                  :style="{ color: $themePalette.grey.v_700 }"
                >
                  <p
                    v-if="activeSection.section_id === section.section_id"
                    class="current-section-text space-content"
                  >
                    {{ currentSection$() }}
                  </p>
                </KGridItem>
              </KGrid>
            </div>
          </DragHandle>
        </Draggable>
      </transition-group>
    </DragContainer>

    <div class="bottom-buttons-style">
      <KGrid>
        <KGridItem
          :layout12="{ span: 4 }"
          :layout8="{ span: 2 }"
          :layout4="{ span: 1 }"
        >
          <KButton
            :text="deleteSectionLabel$()"
            @click="deleteSection(activeSection.section_id)"
          />
        </KGridItem>
        <KGridItem
          :layout12="{ span: 8 }"
          :layout8="{ span: 6 }"
          :layout4="{ span: 3 }"
        >
          <KButton
            :primary="true"
            :text="applySettings$()"
            class="apply-settings-style"
            @click="applySettings"
          />

        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';

  export default {
    name: 'SectionEditor',
    components: {
      Draggable,
      DragContainer,
      DragHandle,
    },
    setup() {
      const {
        sectionSettings$,
        sectionTitle$,
        numberOfQuestionsLabel$,
        optionalDescriptionLabel$,
        quizResourceSelection$,
        numberOfSelectedResources$,
        currentSection$,
        deleteSectionLabel$,
        applySettings$,
        changeResources$,
        sectionOrder$,
        questionOrder$,
        randomizedLabel$,
        randomizedOptionDescription$,
        fixedLabel$,
        fixedOptionDescription$,
      } = enhancedQuizManagementStrings;

      const {
        activeSection,
        allSections,
        updateSection,
        updateQuiz,
        deleteSection,
      } = injectQuizCreation();

      const selectedQuestionOrder = ref(get(activeSection).learners_see_fixed_order);
      const numberOfQuestions = ref(get(activeSection).question_count);
      const descriptionText = ref(get(activeSection).description);
      const sectionTitle = ref(get(activeSection).section_title);

      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();
      return {
        // useQuizCreation
        activeSection,
        allSections,
        updateSection,
        updateQuiz,
        deleteSection,
        // Form models
        selectedQuestionOrder,
        numberOfQuestions,
        descriptionText,
        sectionTitle,
        // Responsiveness
        windowIsLarge,
        windowIsSmall,
        // i18n
        sectionSettings$,
        sectionTitle$,
        numberOfQuestionsLabel$,
        optionalDescriptionLabel$,
        quizResourceSelection$,
        numberOfSelectedResources$,
        currentSection$,
        deleteSectionLabel$,
        applySettings$,
        changeResources$,
        sectionOrder$,
        questionOrder$,
        randomizedLabel$,
        randomizedOptionDescription$,
        fixedLabel$,
        fixedOptionDescription$,
      };
    },
    computed: {
      borderStyle() {
        return `border: 1px solid ${this.$themeTokens.fineLine}`;
      },
      activeSectionStyles() {
        return {
          backgroundColor: this.$themePalette.grey.v_50,
          border: `1px solid ${this.$themeTokens.fineLine}`,
        };
      },
      dividerStyle() {
        return `color : ${this.$themeTokens.fineLine}`;
      },
      /**
       * @returns { QuizSection[] }
       */
      sectionOrderList() {
        return this.allSections;
      },
      draggableStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
        };
      },
    },
    methods: {
      handleSectionSort(e) {
        this.updateQuiz({ question_sources: e.newArray });
      },
      applySettings() {
        this.updateSection({
          section_id: this.activeSection.section_id,
          section_title: this.sectionTitle,
          description: this.descriptionText,
          question_count: this.numberOfQuestions,
          learners_see_fixed_order: this.selectedQuestionOrder,
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .number-field {
    display: inline-block;
    max-width: 31em;
    margin-right: 0.5em;
  }

  .section-settings-heading {
    font-size: 1em;
    font-weight: 600;
  }

  .section-settings-top-heading {
    font-size: 18px;
    font-weight: 600;
  }

  .section-order-list {
    height: 2.5em;
    margin-top: 0.5em;
    border: 1px solid;
    border-radius: 2px;
  }

  .space-content {
    margin: 0.5em;
    font-size: 1em;
  }

  .number-input-grid-item {
    display: inline-flex;
  }

  .group-button-border {
    display: inline-flex;
    align-items: center;
    height: 3.5em;
    border: 1px solid;
  }

  .number-question {
    display: inline-flex;
    float: right;
  }

  .change-resource-button-style {
    display: block;
    width: 100%;
    margin-bottom: 1.5em;
  }

  .section-order-style {
    font-size: 1em;
  }

  .current-section-style {
    font-size: 1em;
  }

  .bottom-buttons-style {
    bottom: 0;
    margin-top: 4em;
    margin-bottom: 1em;
  }

  .description-ktextbox-style /deep/ .ui-textbox-label {
    width: 160%;
  }

  /deep/ .KButton-noKey-0_1xktocf {
    width: 100%;
  }

  .current-section-text {
    text-align: right;
  }

  .section-settings-content {
    margin-top: -50px;
  }

</style>
