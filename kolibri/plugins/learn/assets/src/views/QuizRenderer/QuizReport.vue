<template>

  <ExamReport
    v-if="content"
    class="report"
    :contentId="content.content_id"
    :title="content.title"
    :duration="content.duration"
    :userName="userName"
    :userId="userId"
    :selectedInteractionIndex="selectedInteractionIndex"
    :questionNumber="questionNumber"
    :tryIndex="tryIndex"
    :exercise="content"
    :exerciseContentNodes="[content]"
    :navigateTo="navigateTo"
    :questions="questions"
    :isSurvey="isSurvey"
    :isQuiz="!isSurvey"
  >
    <template #actions>
      <KButton @click="$emit('repeat')">
        {{ isSurvey ? $tr('submitAgainButton') : $tr('tryAgainButton') }}
      </KButton>
    </template>
  </ExamReport>

</template>


<script>

  import get from 'lodash/get';
  import Modalities from 'kolibri-constants/Modalities';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ExamReport from 'kolibri-common/components/quizzes/QuizReport';
  import commonLearnStrings from '../commonLearnStrings';

  export default {
    name: 'QuizReport',
    components: {
      ExamReport,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    props: {
      content: {
        type: Object,
        required: true,
      },
      userId: {
        type: String,
        default: null,
      },
      userName: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        questionNumber: 0,
        selectedInteractionIndex: 0,
        tryIndex: 0,
      };
    },
    computed: {
      questions() {
        return this.content
          ? this.content.assessmentmetadata.assessment_item_ids.map((id, index) => ({
            item: id,
            question_id: id,
            exercise_id: this.content.id,
            counter_in_exercise: index,
            title: this.content.title,
          }))
          : [];
      },
      isSurvey() {
        return get(this, ['content', 'options', 'modality']) === Modalities.SURVEY;
      },
    },
    methods: {
      navigateTo(tryIndex, question, interaction) {
        this.tryIndex = tryIndex;
        this.questionNumber = question;
        this.selectedInteractionIndex = interaction;
      },
    },
    $trs: {
      tryAgainButton: {
        message: 'Try again',
        context: 'Label for a button used to retake the quiz',
      },
      submitAgainButton: {
        message: 'Submit again',
        context: 'Label for a button used to resubmit the survey',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .no-exercise {
    text-align: center;
  }

  .container {
    top: 24px;
    max-width: 1000px;
    margin: 0 auto;
    background-color: white;
  }

  .report {
    margin: auto;
  }

</style>
