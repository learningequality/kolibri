<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePagePrimary="false"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="$tr('appBarLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :marginBottom="72"
  >

    <KPageContainer>
      <h1>{{ $tr('preview') }}</h1>
      <h2>{{ coachString('detailsLabel') }}</h2>
      <KGrid>
        <KGridItem :layout12="{ span: 6 }">
          <KTextbox
            ref="title"
            v-model.trim="examTitle"
            :label="coachString('titleLabel')"
            :autofocus="true"
            :maxlength="100"
            :invalid="Boolean(showError && titleIsInvalidText)"
            :invalidText="titleIsInvalidText"
            @input="showTitleError = false"
          />
        </KGridItem>
        <KGridItem :layout12="{ span: 6 }" class="number-input-grid-item">
          <KTextbox
            ref="numQuest"
            v-model.trim.number="numQuestions"
            type="number"
            :min="1"
            :max="maxQs"
            :label="$tr('numQuestions')"
            :invalid="Boolean(showError && numQuestIsInvalidText)"
            :invalidText="numQuestIsInvalidText"
            class="number-field"
          />
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === 1"
            @click="numQuestions -= 1"
          >
            <mat-svg name="remove" category="content" />
          </UiIconButton>
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === maxQs"
            @click="numQuestions += 1"
          >
            <mat-svg name="add" category="content" />
          </UiIconButton>
        </KGridItem>
      </KGrid>
      <div>
        <UiIconButton
          type="flat"
          aria-hidden="true"
          tabindex="-1"
          color="primary"
          @click="getNewQuestionSet"
        >
          <mat-svg name="refresh" category="navigation" />
        </UiIconButton>
        <KButton
          :text="$tr('randomize')"
          appearance="basic-link"
          :primary="false"
          @click="getNewQuestionSet"
        />
      </div>
      <h2 class="header-margin">
        {{ coachString('questionOrderLabel') }}
      </h2>
      <div>
        <KRadioButton
          v-model="fixedOrder"
          :label="coachString('orderRandomLabel')"
          :description="coachString('orderRandomDescription')"
          :value="false"
        />
        <KRadioButton
          v-model="fixedOrder"
          :label="coachString('orderFixedLabel')"
          :description="coachString('orderFixedDescription')"
          :value="true"
        />
      </div>

      <h2 class="header-margin">
        {{ $tr('questionsLabel') }}
      </h2>

      <QuestionListPreview
        v-if="!loadingNewQuestions"
        :fixedOrder="fixedOrder"
        :selectedQuestions="selectedQuestions"
        :selectedExercises="selectedExercises"
      />

      <BottomAppBar style="z-index: 1062;">
        <KRouterLink
          appearance="flat-button"
          :text="coreString('goBackAction')"
          :to="toolbarRoute"
        />
        <KButton
          :text="coreString('finishAction')"
          :disabled="loadingNewQuestions"
          primary
          @click="submit"
        />
      </BottomAppBar>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import { MAX_QUESTIONS } from '../../../constants/examConstants';
  import QuestionListPreview from './QuestionListPreview';

  export default {
    name: 'CreateExamPreview',
    metaInfo() {
      return {
        title: this.$tr('title'),
      };
    },
    components: {
      UiIconButton,
      BottomAppBar,
      QuestionListPreview,
    },
    mixins: [responsiveWindowMixin, commonCoach, commonCoreStrings],
    data() {
      return {
        showError: false,
        showTitleError: false,
      };
    },
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', [
        'loadingNewQuestions',
        'selectedQuestions',
        'selectedExercises',
        'availableQuestions',
      ]),
      maxQs() {
        return MAX_QUESTIONS;
      },
      examTitle: {
        get() {
          return this.$store.state.examCreation.title;
        },
        set(value) {
          this.$store.commit('examCreation/SET_TITLE', value);
        },
      },
      numQuestions: {
        get() {
          return this.$store.state.examCreation.numberOfQuestions;
        },
        set(value) {
          if (value && value >= 1 && value <= this.maxQs) {
            this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);
            this.$store.dispatch('examCreation/updateSelectedQuestions');
          }
        },
      },
      fixedOrder: {
        get() {
          return this.$store.state.examCreation.learnersSeeFixedOrder;
        },
        set(value) {
          this.$store.commit('examCreation/SET_FIXED_ORDER', value);
        },
      },
      titleIsInvalidText() {
        if (this.examTitle === '') {
          return this.coreString('requiredFieldError');
        }
        if (this.showTitleError) {
          return this.coachString('quizDuplicateTitleError');
        }
        return null;
      },
      numQuestIsInvalidText() {
        if (this.numQuestions === '') {
          return this.$tr('numQuestionsBetween');
        }
        if (this.numQuestions < 1 || this.numQuestions > 50) {
          return this.$tr('numQuestionsBetween');
        }
        if (!Number.isInteger(this.numQuestions)) {
          return this.$tr('numQuestionsBetween');
        }
        if (this.numQuestions > this.availableQuestions) {
          return this.$tr('numQuestionsExceed', {
            inputNumQuestions: this.numQuestions,
            maxQuestionsFromSelection: this.availableQuestions,
          });
        }
        return null;
      },
    },
    methods: {
      getNewQuestionSet() {
        this.$store.commit('examCreation/RANDOMIZE_SEED');
        this.$store.dispatch('examCreation/updateSelectedQuestions');
      },
      submit() {
        if (this.numQuestIsInvalidText) {
          this.showError = true;
          this.$refs.numQuest.focus();
        } else if (this.titleIsInvalidText) {
          this.showError = true;
          this.$refs.title.focus();
        } else {
          this.$store
            .dispatch('adHocLearners/createAdHocLearnersGroup', {
              classId: this.$route.params.classId,
            })
            .then(() => {
              const params = {
                classId: this.classId,
                adHocGroupId: this.$store.state.adHocLearners.id,
              };
              this.$store.dispatch('examCreation/createExamAndRoute', params).catch(error => {
                const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
                if (errors) {
                  this.showError = true;
                  this.showTitleError = true;
                  this.$refs.title.focus();
                } else {
                  this.$store.dispatch('handleApiError', error);
                }
              });
            });
        }
      },
    },
    $trs: {
      title: 'Select questions',
      appBarLabel: 'Select exercises',
      randomize: 'Choose a different set of questions',
      questionsLabel: 'Questions',
      preview: 'Preview quiz',
      numQuestionsBetween: 'Enter a number between 1 and 50',
      numQuestionsExceed:
        'The max number of questions based on the exercises you selected is {maxQuestionsFromSelection}. Select more exercises to reach {inputNumQuestions} questions, or lower the number of questions to {maxQuestionsFromSelection}.',
      numQuestions: 'Number of questions',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

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

  .header-margin {
    margin-top: 32px;
  }

  .sortable-ghost {
    visibility: hidden;
  }

  .sortable-ghost * {
    visibility: hidden;
  }

</style>
