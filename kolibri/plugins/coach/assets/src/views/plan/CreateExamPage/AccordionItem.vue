<template>

  <Draggable :key="new Date()">
    <KGrid class="question-row">
      <KGridItem :layout12="{ span: 6 }">
        <div class="left-column-alignment-style">
          <DragHandle>
            <!-- FIXME: Needs vertically centered -->
            <KIcon
              class="icon-size"
              icon="dragVertical"
            />
          </DragHandle>

          <div>
            <p>
              <KCheckbox />
            </p>
          </div>

          <div>
            <p @click="toggleQuestionAnswers">
              TODO: Question title;
            </p>
          </div>
        </div>
      </KGridItem>

      <KGridItem :layout12="{ span: 6 }">
        <div class="right-alignment-style">
          <KIcon
            v-if="showAnswers"
            class="icon-size"
            icon="chevronUp"
          />

          <KIcon
            v-else
            class="icon-size"
            icon="chevronRight"
          />
        </div>
      </KGridItem>
    </KGrid>

    <div v-if="showAnswers" class="answers-section">

      <KGrid>
        <KGridItem :layout12="{ span: 8 }">
          <p>{{ $tr('questionPhrase') }}</p>
          <p>{{ $tr('questionSubtitle') }}</p>
        </KGridItem>

        <KGridItem :layout12="{ span: 4 }">
          <KIcon class="float-item-left-style" icon="edit" />
        </KGridItem>
      </KGrid>

      <hr>

      <div class="choose-question question">
        <p class="space-content">
          {{ $tr('chooseQuestionLabel') }}
        </p>
      </div>

      <div class="question">
        <AnswerOption />
      </div>

      <div class="question">
        <AnswerOption />
      </div>

      <KButton
        style="width:100%;margin-bottom:10px"
        appearance="raised-button"
        icon="plus"
      >
        {{ $tr('addAnswer') }}
      </KButton>

    </div>

  </Draggable>

</template>

<script>

  import AnswerOption from './AnswerOption.vue';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';

  export default {
    name: 'AccordionItem',
    components: {
      AnswerOption,
      Draggable,
      DragHandle,
    },
    data() {
      return {
        showAnswers: false,
      };
    },
    methods: {
      toggleQuestionAnswers() {
        if (this.showAnswers) {
          this.showAnswers = false;
        } else {
          this.showAnswers = true;
        }
      },
    },

    $trs: {
      selectAllLabel: {
        message: 'Select all',
        context: 'Label indicates that all available options can be chosen at once.',
      },
      questionPhrase: {
        message: 'Select the word that has the following vowel sound.',
        context: 'Placholder for the question',
      },
      questionSubtitle: {
        message: ' Short <e>, [e]</e>',
        context: 'Placholder content for the question description',
      },
      chooseQuestionLabel: {
        message: 'Choose 1 answer:',
        context: 'Label to indicate the question to be chosen',
      },
      addAnswer: {
        message: 'Add answer',
        context: 'Button text to indicate that more answers can be added to the question.',
      },
    },
  };

</script>

<style scoped>
    .icon-size{
        width:24px;
        height:24px;
    }

    .question-row{
        border-top:1px solid #DEDEDE;
        border-bottom: 1px solid  #DEDEDE;
    }

    .left-column-alignment-style{
        display:inline-flex;
        margin-left: 10px;
    }

    .right-alignment-style{
        float:right;
        margin-top:10px;
    }

    #bottom-border{
        line-height: 1.2;
        color: #DEDEDE;
        margin-bottom:10px;
    }

    .option{
        width: Fixed (922px);
        height: Hug (40px);
        padding: 10px;
        border-radius: 2px;
        border: 1px;
        gap: 4px;
    }
    .question{
        border:1px solid #DEDEDE;
        border-radius:5px;
        margin-top:5px;
        margin-bottom:5px;
    }
    .space-content{
        margin:10px;
    }
    .float-item-left-style{
        float:right;
    }

    .choose-question{
        background-color: #FAFAFA;
    }
</style>
