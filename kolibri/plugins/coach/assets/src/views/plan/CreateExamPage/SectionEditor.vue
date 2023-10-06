<template>

  <div class="section-settings-content">
    <h5
      class="section-settings-top-heading"
      :style="{ color: $themeTokens.text }"
    >
      {{ $tr('sectionSettingsHeading') }}
    </h5>

    <KGrid>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 2 }"
      >
        <KTextbox
          :label="$tr('sectionTitle')"
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
              v-model="numQuestions"
              type="number"
              :label="$tr('numberOfQuestion')"
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
                :disabled="numQuestions === 1"
                @click="numQuestions -= 1"
              />
              <span
                :style="dividerStyle"
              > | </span>
              <KIconButton
                icon="plus"
                aria-hidden="true"
                class="number-btn"
                @click="numQuestions += 1"
              />
            </div>
          </div>
        </div>
      </KGridItem>
    </KGrid>

    <KTextbox
      :label="$tr('descriptionLabel')"
      :maxlength="400"
      :textArea="true"
      class="description-ktextbox-style"
    />

    <hr :style="dividerStyle">

    <div>
      <h5
        class="section-settings-heading"
      >
        {{ $tr('questionOrder') }}
      </h5>
      <KGrid>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KRadioButton
            v-model="selectedQuestionOrder"
            :label="$tr('randomizedLabel')"
            :value="$tr('randomizedLabel')"
            :description="$tr('randomizedOptionDescription')"
          />
        </KGridItem>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KRadioButton
            v-model="selectedQuestionOrder"
            :label="$tr('fixedLabel')"
            :value="$tr('fixedLabel')"
            :description="$tr('fixedOptionDescription')"
          />
        </KGridItem>
      </KGrid>
    </div>

    <hr :style="dividerStyle">

    <h5
      class="section-settings-heading"
    >
      {{ $tr('quizResourceSelection') }}
    </h5>
    <p>{{ $tr('selectedResources', { count: 2 }) }}</p>

    <KButton
      :text="$tr('changeResourceButton')"
      iconAfter="forward"
      class="change-resource-button-style"
    />

    <hr :style="dividerStyle">

    <h5
      class="section-order-style section-settings-heading"
    >
      {{ $tr('sectionOrderTitle') }}
    </h5>

    <div
      :style="activeSection"
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
            {{ $tr('sectionOrderTitle').toUpperCase() }}
          </p>
        </KGridItem>

        <KGridItem
          :layout12="{ span: 5 }"
          :layout8="{ span: 3 }"
          class="current-section-style"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          <p class="current-section-text space-content">
            {{ $tr('currentSection') }}
          </p>
        </KGridItem>
      </KGrid>
    </div>
    <div
      :style="borderStyle"
      class="section-order-list"
    >
      <KGrid>
        <KGridItem
          :layout12="{ span: 1 }"
          :layout8="{ span: 1 }"
          :layout4="{ span: 1 }"
        >
          <KIcon
            icon="dragVertical"
            class="space-content"
          />
        </KGridItem>

        <KGridItem
          :layout12="{ span: 10 }"
          :layout8="{ span: 7 }"
          :layout4="{ span: 3 }"
        >
          <p class="space-content">
            {{ $tr('uniqueTitle').toUpperCase() }}
          </p>
        </KGridItem>
      </KGrid>
    </div>

    <div class="bottom-buttons-style">
      <KGrid>
        <KGridItem
          :layout12="{ span: 4 }"
          :layout8="{ span: 2 }"
          :layout4="{ span: 1 }"
        >
          <KButton
            :text="$tr('deleteSectionButton')"
          />
        </KGridItem>
        <KGridItem
          :layout12="{ span: 8 }"
          :layout8="{ span: 6 }"
          :layout4="{ span: 3 }"
        >
          <KButton
            :primary="true"
            :text="$tr('applySettingsButton')"
            class="apply-settings-style"
          />

        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';

  export default {
    name: 'SectionEditor',
    components: {},
    mixins: [enhancedQuizManagementStrings],
    setup() {
      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();
      return { windowIsLarge, windowIsSmall };
    },
    data() {
      return {
        selectedQuestionOrder: '',
        numQuestions: 1,
      };
    },
    computed: {
      borderStyle() {
        return `border: 1px solid ${this.$themeTokens.fineLine}`;
      },
      activeSection() {
        return {
          backgroundColor: this.$themePalette.grey.v_50,
          border: `1px solid ${this.$themeTokens.fineLine}`,
        };
      },
      dividerStyle() {
        return `color : ${this.$themeTokens.fineLine}`;
      },
    },
    $trs: {
      sectionSettingsHeading: {
        message: 'Section settings',
        context: 'Heading for the section settings side panel.',
      },
      sectionTitle: {
        message: 'Section title',
        context: 'Label for section settings title input field.',
      },
      numberOfQuestion: {
        message: 'Number of questions',
        context: 'label for section settings number of questions input field.',
      },
      descriptionLabel: {
        message: 'Description (optional)',
        context: 'Label for the section settings description input field.',
      },
      questionOrder: {
        message: 'Question order',
        context: 'Heading for the question order',
      },
      randomizedLabel: {
        message: 'Randomized',
        context: 'Radio button label for displaying random questions to learners.',
      },
      randomizedOptionDescription: {
        message: 'Each learner sees a different question order',
        context: 'Describes how the randomize radio button works when selected.',
      },
      fixedLabel: {
        message: 'Fixed',
        context: 'Radio button label for displaying same question order to learners.',
      },
      fixedOptionDescription: {
        message: 'Each learner sees the same question order',
        context: 'Describes how the fixed radio button works when selected.',
      },
      quizResourceSelection: {
        message: 'Quiz resource selection',
        context: 'Subtitle for quiz resource selection in the section settings side panel.',
      },
      selectedResources: {
        message: '{count} resources selected from  {count} channels',
        context: "Only translate  'resources selected from' and 'channels'.",
      },
      changeResourceButton: {
        message: 'Change resources',
        context: 'Button for changing the resources in the section settings sidepanel.',
      },
      sectionOrderTitle: {
        message: 'Section order',
        context: 'Subheading for section ordering in the section settings sidepanel.',
      },
      currentSection: {
        message: 'Current Section',
        context: 'label for the currently ordered section.',
      },
      deleteSectionButton: {
        message: 'Delete section',
        context: 'Button for deleting section.',
      },
      applySettingsButton: {
        message: 'Apply settings',
        context: 'Button to save the new section settings.',
      },
      uniqueTitle: {
        message: 'Section 2 / unique title',
        context: 'Label for the other sections other than the current section.',
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
