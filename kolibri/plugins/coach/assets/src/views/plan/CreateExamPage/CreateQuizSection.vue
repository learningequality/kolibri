<template>

  <div>
    <KGrid>
      <KGridItem
        :layout4="{ span: 1 }"
        :layout8="{ span: 1 }"
        :layout12="{ span: 1 }"
      >
        <KIcon
          icon="quiz"
          class="style_icon"
        />
      </KGridItem>

      <KGridItem
        :layout4="{ span: 3 }"
        :layout8="{ span: 7 }"
        :layout12="{ span: 11 }"
      >

        <KTextbox
          ref="title"
          :label="coachString('titleLabel')"
          :autofocus="true"
          :maxlength="100"
          class="text-box-style"
        />
      </KGridItem>
    </KGrid>

    <p>{{ $tr('addSectionsDescription') }}</p>

    <hr id="bottom-border">
    <br>

    <KGrid>
      <KGridItem
        :layout12="{ span: 8 }"
      >
        <span class="active-section">
          {{ ($tr('sectionLabel')).toUpperCase() }}
        </span>
      </KGridItem>

      <KGridItem
        :layout12="{ span: 4 }"
      >
        <KButton
          class="add-section-button"
          appearance="flat-button"
          icon="plus"
        >
          {{ ($tr('addSection')).toUpperCase() }}
        </KButton>
      </KGridItem>
    </KGrid>

    <hr id="bottom-border">


    <AccordionContainer
      v-if="isQuestionAvailable"
    />

    <div
      v-else
      class="no-question-layout"
    >
      <div class="question-mark-layout">
        <span id="help-icon-style">?</span>
      </div>

      <p class="no-question-style">
        {{ $tr('noQuestionsLabel') }}
      </p>

      <p>{{ $tr('selectResourceGuide') }}</p>

      <KButton
        primary
        icon="plus"
      >
        {{ $tr('addQuestion') }}
      </KButton>

    </div>
  </div>

</template>

<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import AccordionContainer from './AccordionContainer.vue';

  export default {
    name: 'CreateQuizSection',
    components: {
      AccordionContainer,
    },
    mixins: [commonCoreStrings, commonCoach],
    data() {
      return {
        isQuestionAvailable: true,
      };
    },
    $trs: {
      sectionLabel: {
        message: 'section 1',
        context: 'Indicates the section number created',
      },
      addSection: {
        message: 'add section',
        context: 'Label for adding the number of quiz sections',
      },
      noQuestionsLabel: {
        message: 'There are no questions in this section',
        context: 'Indicates that there is no question in the particular section',
      },
      selectResourceGuide: {
        message: 'To add questions, select resources from the available channels.',
        context: 'Explains a way of adding a question',
      },
      addQuestion: {
        message: 'Add Questions',
        context: 'Button label for adding a new question',
      },
      addSectionsDescription: {
        message: 'Add one or more sections to your quiz, according to your needs',
        context:
          'This message indicates that more than one section can be added when creating a quiz.',
      },
    },
  };

</script>

<style lang="scss"  scoped>

  .style_icon {
    width: 40px;
    height: 40px;
    margin: 20px;
  }

  /deep/ .ui-textbox-label {
    width: 902px;
  }

  #bottom-border {
    margin-bottom: 10px;
    line-height: 1.2;
    color: #dedede;
  }

  .no-question-layout {
    gap: 40px;
    width: fill (952px);
    height: fill (265px);
    padding: 40px;
    text-align: center;
    background-color: #fafafa;
    border: 1px;
    border-radius: 10px;
  }

  .question-mark-layout {
    align-items: center;
    width: 40px;
    height: 40px;
    margin: auto;
    background-color: #dbc3d4;
  }

  #help-icon-style {
    font-size: 24px;
    font-weight: 700;
    line-height: 34px;
    color: #996189;
  }

  .active-section {
    color: #996189;
    border-bottom: 1px solid #996189;
  }

  .add-section-button {
    float: right;
    background-color: #f5f5f5;
  }

  .text-box-style {
    width: 1000px;
    padding: 15px;
  }

</style>
