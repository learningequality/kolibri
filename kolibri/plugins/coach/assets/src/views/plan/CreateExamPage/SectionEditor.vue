<template>

  <div>
    <h5
      class="section-settings-heading"
    >
      {{ $tr('sectionSettingsHeading') }}
    </h5>
    <!-- <h2>
      <KRouterLink appearance="raised-button" :to="{ path: 'select-resources' }">
        Select resources
      </KRouterLink>
    </h2> -->

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
        class="number-input-grid-item"
      >
        <KTextbox
          ref="numQuest"
          v-model="numQuestions"
          type="number"
          :label="$tr('numberOfQuestion')"
          class="number-field"
        />
        <KIconButton
          icon="minus"
          aria-hidden="true"
          class="number-btn"
          :disabled="numQuestions === 1"
          @click="numQuestions -= 1"
        />
        <KIconButton
          icon="plus"
          aria-hidden="true"
          class="number-btn"
          @click="numQuestions += 1"
        />
      </KGridItem>
    </KGrid>

    <KTextbox
      :label="$tr('descriptionLabel')"
      :maxlength="400"
    />

    <hr>

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
          />
        </KGridItem>
        <KGridItem :layout12="{ span: 6 }">
          <KRadioButton
            v-model="selectedQuestionOrder"
            :label="$tr('fixedLabel')"
            :value="$tr('fixedLabel')"
          />
        </KGridItem>
      </KGrid>
    </div>

    <hr>

    <h2>{{ $tr('quizResourceSelection') }}</h2>
    <p>{{ $tr('selectedResources', { count: 2 }) }}</p>

    <KButton
      :text="$tr('changeResourceButton')"
      iconAfter="forward"
    />

    <hr>

    <h2>{{ $tr('sectionOrderTitle') }}</h2>

    <div class="section-order-list">
      <KGrid>
        <KGridItem
          :layout12="{ span: 1 }"
        >
          <KIcon
            icon="dragVertical"
          />
        </KGridItem>

        <KGridItem
          :layout12="{ span: 6 }"
        >
          <p class="space-content">
            {{ $tr('sectionOrderTitle') }}
          </p>
        </KGridItem>

        <KGridItem
          :layout12="{ span: 4 }"
        >
          <p>{{ $tr('currentSection') }}</p>
        </KGridItem>
      </KGrid>
    </div>

    <div style="position:absolute;bottom: 0;margin-bottom:3em;">
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
            style="width:200px"
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
        numQuestions: null,
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
        context: 'Settings section randomized radio button label.',
      },
      fixedLabel: {
        message: 'Fixed',
        context: 'Settings section fixed radio button label.',
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

  .number-btn {
    position: relative;
    top: 16px;
    display: inline-block;
    vertical-align: top;
  }

  .section-settings-heading {
    font-size: 18px;
    font-weight: 600;
  }

  .section-order-list {
    height: 40px;
    margin-top: 0.5em;
    background-color: #fafafa;
    border: 1px solid #dedede;
    border-radius: 2px;
  }

  .space-content {
    margin: 0.5em;
  }

  .number-input-grid-item {
    display: inline-flex;
  }

</style>
