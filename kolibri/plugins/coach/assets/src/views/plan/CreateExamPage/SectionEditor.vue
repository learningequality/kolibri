<template>

  <div>
    <h5
      class="section-settings-heading"
    >
      {{ $tr('sectionSettingsHeading') }}
    </h5>

    <KGrid>
      <KGridItem
        :layout12="{ span: 6 }"
      >
        <KTextbox
          :label="$tr('sectionTitle')"
          :maxlength="100"
        />
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6 }"
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
                class="button-separating-border"
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
    />

    <hr class="divider-style">

    <div>
      <h2>{{ $tr('questionOrder') }}</h2>
      <KGrid>
        <KGridItem
          :layout12="{ span: 6 }"
        >
          <KRadioButton
            v-model="selectedQuestionOrder"
            :label="$tr('randomizedLabel')"
            :value="$tr('randomizedLabel')"
            :description="$tr('randomizedOptionDescription')"
          />
        </KGridItem>
        <KGridItem :layout12="{ span: 6 }">
          <KRadioButton
            v-model="selectedQuestionOrder"
            :label="$tr('fixedLabel')"
            :value="$tr('fixedLabel')"
            :description="$tr('fixedOptionDescription')"
          />
        </KGridItem>
      </KGrid>
    </div>

    <hr class="divider-style">

    <h2>{{ $tr('quizResourceSelection') }}</h2>
    <p>{{ $tr('selectedResources', { count: 2 }) }}</p>

    <KButton
      :text="$tr('changeResourceButton')"
      iconAfter="forward"
      class="change-resource-button-style"
    />

    <hr class="divider-style">

    <h6
      class="section-order-style"
    >
      {{ $tr('sectionOrderTitle') }}
    </h6>

    <div class="current-section section-order-list">
      <KGrid>
        <KGridItem
          :layout12="{ span: 1 }"
        >
          <KIcon
            icon="dragVertical"
            class="space-content"
          />
        </KGridItem>

        <KGridItem
          :layout12="{ span: 6 }"
        >
          <p class="space-content">
            {{ $tr('sectionOrderTitle').toUpperCase() }}
          </p>
        </KGridItem>

        <KGridItem
          :layout12="{ span: 4 }"
          class="current-section-style"
        >
          <p>{{ $tr('currentSection') }}</p>
        </KGridItem>
      </KGrid>
    </div>
    <div class="section-order-list">
      <KGrid>
        <KGridItem
          :layout12="{ span: 1 }"
        >
          <KIcon
            icon="dragVertical"
            class="space-content"
          />
        </KGridItem>

        <KGridItem
          :layout12="{ span: 10 }"
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
          :layout12="{ span: 6 }"
        >
          <KButton
            :text="$tr('deleteSectionButton')"
          />
        </KGridItem>
        <KGridItem
          :layout12="{ span: 6 }"
        >
          <KButton
            :primary="true"
            :text="$tr('applySettingsButton')"
          />

        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'SectionEditor',
    components: {},
    data() {
      return {
        selectedQuestionOrder: '',
        numQuestions: 1,
      };
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
    max-width: 250px;
    margin-right: 8px;
  }

  .section-settings-heading {
    font-size: 18px;
    font-weight: 600;
  }

  .section-order-list {
    height: 40px;
    margin-top: 0.5em;
    border: 1px solid #dedede;
    border-radius: 2px;
  }

  .space-content {
    margin: 0.5em;
  }

  .number-input-grid-item {
    display: inline-flex;
  }

  .button-separating-border {
    margin-top: 0.5em;
    color: #dedede;
  }

  .group-button-border {
    display: inline-flex;
    border: 1px solid #dedede;
  }

  .number-question {
    display: inline-flex;
  }

  .divider-style {
    color: #dedede;
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
    float: left;
    margin-left: auto;
    font-size: 12px;
    color: #616161;
  }

  .current-section {
    background-color: #f5f5f5;
  }

  .bottom-buttons-style {
    position: absolute;
    bottom: 0;
    margin-bottom: 2.5em;
  }

</style>
