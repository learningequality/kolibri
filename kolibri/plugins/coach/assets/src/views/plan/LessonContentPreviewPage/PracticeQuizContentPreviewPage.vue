<template>

  <MultiPaneLayout>
    <template #header>
      <div>
        <KGrid>
          <KGridItem
            :layout8="{ span: 6 }"
            :layout12="{ span: 9 }"
          >
            <h1>
              <KLabeledIcon :icon="content.kind" :label="updateTitle" />
            </h1>
          </KGridItem>
          <KGridItem
            :layout="{ alignment: 'right' }"
            :layout8="{ span: 2 }"
            :layout12="{ span: 3 }"
          >
            <KButton
              :text="$tr('selectQuiz')"
              :primary="true"
              :disabled="false"
              @click="submit"
            />
          </KGridItem>
        </KGrid>
        <CoachContentLabel :value="content.num_coach_contents" :isTopic="false" />

        <HeaderTable>
          <HeaderTableRow
            :keyText="$tr('totalQuestionsHeader')"
          >
            <template #value>
              {{ content.assessmentmetadata.number_of_assessments }}
            </template>
          </HeaderTableRow>
          <HeaderTableRow
            :keyText="$tr('quizDurationHeader')"
          >
            <template #value>
              {{ currentContentNode.duration || 'Not available' }}
            </template>
          </HeaderTableRow>
          <HeaderTableRow
            v-if="licenseName"
            :keyText="$tr('licenseDataHeader')"
          >
            <template #value>
              {{ licenseName }}
              <InfoIcon
                v-if="licenseDescription"
                :tooltipText="licenseDescription"
                :iconAriaLabel="licenseDescription"
              />
            </template>
          </HeaderTableRow>
          <HeaderTableRow
            v-if="content.license_owner"
            :keyText="$tr('copyrightHolderDataHeader')"
          >
            <template #value>
              {{ content.license_owner }}
            </template>
          </HeaderTableRow>
        </HeaderTable>

      </div>
    </template>

    <template #aside>
      <QuestionList
        :questions="questions"
        :questionLabel="questionLabel"
        :selectedIndex="selectedQuestionIndex"
        @select="selectedQuestionIndex = $event"
      />
    </template>

    <template #main>
      <ContentArea
        class="content-area"
        :header="questionLabel(selectedQuestionIndex)"
        :selectedQuestion="selectedQuestion"
        :content="content"
        :isExercise="isExercise"
      />
    </template>
  </MultiPaneLayout>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import InfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';
  import commonCoach from '../../common';
  import QuestionList from './QuestionList';
  import ContentArea from './ContentArea';

  export default {
    name: 'PracticeQuizContentPreviewPage',
    metaInfo() {
      return {
        title: this.currentContentNode.title,
      };
    },
    components: {
      QuestionList,
      ContentArea,
      CoachContentLabel,
      InfoIcon,
      MultiPaneLayout,
    },
    mixins: [commonCoreStrings, commonCoach],
    props: {
      currentContentNode: {
        type: Object,
        required: true,
      },
      questions: {
        type: Array,
        required: false,
        default: () => [],
      },
    },
    data() {
      return {
        selectedQuestionIndex: 0,
      };
    },
    computed: {
      ...mapState('examCreation', ['title']),
      ...mapGetters('classSummary', ['exams']),
      isExercise() {
        return this.content.kind === 'exercise';
      },
      selectedQuestion() {
        if (this.isExercise) {
          return this.questions[this.selectedQuestionIndex];
        }
        return '';
      },
      content() {
        return this.currentContentNode;
      },
      licenseName() {
        return licenseLongName(this.content.license_name);
      },
      licenseDescription() {
        return licenseDescriptionForConsumer(
          this.content.license_name,
          this.content.license_description
        );
      },
      newTitle() {
        const currentPracticeQuizName = this.content.title;
        const practiceQuizNameAlreadyExists = this.exams.filter(exam =>
          exam.title.includes(currentPracticeQuizName)
        );

        if (practiceQuizNameAlreadyExists.length >= 1) {
          // Set the new (#) for additional copies based on how many copies exist
          const newCopyNum = practiceQuizNameAlreadyExists.length;
          return this.$tr('duplicateTitle', {
            copyNum: newCopyNum,
            originalTitle: this.content.title,
          });
        }
        return this.content.title;
      },
      updateTitle() {
        this.$store.commit('examCreation/SET_TITLE', this.newTitle);
        return this.title;
      },
    },
    methods: {
      questionLabel(questionIndex) {
        if (!this.isExercise) {
          return '';
        }
        const questionNumber = questionIndex + 1;
        return this.coreString('questionNumberLabel', { questionNumber });
      },
      submit() {
        this.$emit('submit', this.content, this.classId);
      },
    },
    $trs: {
      licenseDataHeader: {
        message: 'License',
        context:
          "Refers to the type of license the learning resource has. For example, 'CC BY-NC' meaning 'Creative Commons: attribution, non-commercial'.",
      },
      copyrightHolderDataHeader: {
        message: 'Copyright holder',
        context:
          'Refers to the entity that holds the copyright for the specified resource material. For example:\n\nCopyright holder: Khan Academy',
      },
      totalQuestionsHeader: {
        message: 'Total questions',
        context: 'Refers to the total number of questions in a quiz.',
      },
      quizDurationHeader: {
        message: 'Quiz duration',
        context:
          'Refers to the recommended time it takes to complete a quiz.\n\nDuration is set by whoever made the quiz originally although coaches have the option to override this.',
      },
      selectQuiz: {
        message: 'Select quiz',
        context: 'Refers to choosing a quiz.',
      },
      duplicateTitle: {
        message: '{ originalTitle } ({ copyNum, number })',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .selected-icon {
    position: relative;
    top: 4px;
    width: 20px;
    height: 20px;
  }

  .meta {
    margin-bottom: 16px;
    font-size: smaller;
  }

  .content-area {
    padding: 16px 0;
  }

</style>
