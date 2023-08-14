<template>

  <div>
    <KGrid
      class="add-padding"
    >
      <KGridItem
        :layout4="{ span: 1 }"
        :layout8="{ span: 1 }"
        :layout12="{ span: 1 }"
      >
        <KIcon
          icon="quiz"
          class="style-icon"
        />
      </KGridItem>

      <KGridItem
        :layout4="{ span: 3 }"
        :layout8="{ span: 7 }"
        :layout12="{ span: 11 }"
      >
        <KTextbox
          ref="title"
          v-model.trim="examTitle"
          :label="coachString('titleLabel')"
          :autofocus="true"
          :maxlength="100"
        />
      </KGridItem>
    </KGrid>

    <p>{{ $tr('addSectionsDescription') }}</p>

    <hr class="bottom-border">
    <br>


    <KGrid
      class="kgrid-alignment-style"
    >
      <KGridItem
        :layout12="{ span: 6 }"
        :style="noKgridItemPadding"
      >
        <KTabs
          tabsId="coachReportsTabs"
          ariaLabel="Coach reports"
          :tabs="tabs"
        >
          <template>

          </template>
        </KTabs>
      </KGridItem>

      <KGridItem
        :layout12="{ span: 6 }"
        :style="noKgridItemPadding"
      >
        <KButton
          class="float-button"
          appearance="flat-button"
          icon="plus"
        >
          {{ ($tr('addSection')).toUpperCase() }}
        </KButton>
      </KGridItem>

    </KGrid>

    <hr class="bottom-border">

    <div class="no-question-layout">

      <div class="question-mark-layout">
        <span class="help-icon-style">?</span>
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

  export default {
    name: 'CreateQuizSection',
    mixins: [commonCoreStrings, commonCoach],
    data() {
      return {
        tabs: [{ id: '', label: this.$tr('sectionLabel') }],
      };
    },
    computed: {
      noKgridItemPadding() {
        return {
          paddingLeft: '0px',
          paddingRight: '0px',
        };
      },
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

  .style-icon {
    width: 40px;
    height: 40px;
    margin: 20px;
  }

  /deep/ .ui-textbox-label {
    width: 1220px;
  }

  .no-question-layout {
    width: auto;
    height: 265px;
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

  .help-icon-style {
    font-size: 24px;
    font-weight: 700;
    color: #996189;
  }

  .active-section {
    padding: 14px;
    color: #996189;
    border-bottom: 2px solid #996189;
  }

  .add-section-button {
    float: right;
    margin-bottom: -8px;
    background-color: #f5f5f5;
  }

  .add-padding {
    padding-top: 15px;
  }

  .no-question-style {
    font-weight: bold;
  }

  .float-button {
    float: right;
    background-color: #f5f5f5;
  }

  .bottom-border {
    border: 1px solid #dedede;
  }

  .kgrid-alignment-style {
    padding-right: 12px;
    padding-left: 0;
    margin-bottom: -25px;
    text-align: left;
  }

</style>
