<template>

  <CoreBase
    :immersivePage="false"
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer v-if="!loading">
      <section>
        <BackLinkWithOptions>
          <BackLink
            slot="backlink"
            :to="$router.getRoute('EXAMS')"
            :text="$tr('allQuizzes')"
          />
          <QuizOptionsDropdownMenu
            slot="options"
            optionsFor="plan"
            @select="setCurrentAction"
          />
        </BackLinkWithOptions>
        <h1>
          <KLabeledIcon>
            <KIcon slot="icon" quiz />
            {{ quiz.title }}
          </KLabeledIcon>
        </h1>
      </section>

      <section>
        <HeaderTable>
          <HeaderTableRow :keyText="common$tr('statusLabel')">
            <QuizActive slot="value" :active="quiz.active" />
          </HeaderTableRow>
          <HeaderTableRow :keyText="common$tr('recipientsLabel')">
            <Recipients
              slot="value"
              :groupNames="learnerGroupNames"
              :hasAssignments="quiz.assignments.length > 0"
            />
          </HeaderTableRow>
          <HeaderTableRow
            :keyText="common$tr('questionOrderLabel')"
            :valueText="questionOrderValueString"
          />
        </HeaderTable>
      </section>

      <section v-if="selectedQuestions">
        <h2>
          {{ common$tr('numberOfQuestions', { value: selectedQuestions.length }) }}
        </h2>

        <p>
          {{ orderDescriptionString }}
        </p>

        <QuestionListPreview
          :fixedOrder="!quizIsRandomized"
          :readOnly="true"
          :selectedQuestions="selectedQuestions"
          :selectedExercises="selectedExercises"
        />
      </section>
    </KPageContainer>

    <ManageExamModals
      :currentAction="currentAction"
      :quiz="quiz"
      @submit_delete="handleSubmitDelete"
      @submit_copy="handleSubmitCopy"
      @cancel="closeModal"
    />
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import fromPairs from 'lodash/fromPairs';
  import find from 'lodash/find';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { CoachCoreBase } from '../../common';
  import BackLink from '../../common/BackLink';
  import HeaderTable from '../../common/HeaderTable';
  import HeaderTableRow from '../../common/HeaderTable/HeaderTableRow';
  import QuizActive from '../../common/QuizActive';
  import Recipients from '../../common/Recipients';
  import TopNavbar from '../../TopNavbar';
  import QuestionListPreview from '../CreateExamPage/QuestionListPreview';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import BackLinkWithOptions from '../../common/BackLinkWithOptions';
  import QuizOptionsDropdownMenu from './QuizOptionsDropdownMenu';
  import ManageExamModals from './ManageExamModals';
  import {
    fetchQuizSummaryPageData,
    serverAssignmentPayload,
    clientAssigmentState,
    deleteExam,
  } from './api';

  export default {
    name: 'QuizSummaryPage',
    components: {
      BackLink,
      BackLinkWithOptions,
      CoreBase: CoachCoreBase,
      HeaderTable,
      HeaderTableRow,
      KIcon,
      KLabeledIcon,
      KPageContainer,
      ManageExamModals,
      QuestionListPreview,
      QuizActive,
      QuizOptionsDropdownMenu,
      Recipients,
      TopNavbar,
    },
    mixins: [coachStringsMixin],
    data() {
      return {
        quiz: {
          active: false,
          assignments: [],
          learners_see_fixed_order: false,
          question_sources: [],
          title: '',
        },
        selectedExercises: {},
        loading: true,
        currentAction: '',
      };
    },
    computed: {
      ...mapState(['classList']),
      ...mapState('classSummary', ['groupMap']),
      selectedQuestions() {
        return this.quiz.question_sources;
      },
      quizIsRandomized() {
        return !this.quiz.learners_see_fixed_order;
      },
      questionOrderValueString() {
        return this.quizIsRandomized
          ? this.common$tr('orderRandomLabel')
          : this.common$tr('orderFixedLabel');
      },
      orderDescriptionString() {
        return this.quizIsRandomized
          ? this.common$tr('orderRandomDescription')
          : this.common$tr('orderFixedDescription');
      },
      classId() {
        return this.$route.params.classId;
      },
      learnerGroupNames() {
        const names = [];
        const { assignments = [] } = this.quiz;
        assignments.forEach(({ collection }) => {
          const match = this.groupMap[collection];
          if (match) {
            return names.push(match.name);
          }
        });
        return names;
      },
    },
    beforeRouteEnter(to, from, next) {
      return fetchQuizSummaryPageData(to.params.quizId)
        .then(data => {
          next(vm => vm.setData(data));
        })
        .catch(error => {
          next(vm => vm.setError(error));
        });
    },
    methods: {
      // @public
      setData(data) {
        const { exam, exerciseContentNodes } = data;
        this.quiz = exam;
        this.selectedExercises = fromPairs(exerciseContentNodes.map(x => [x.id, x]));
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      // @public
      setError(error) {
        this.$store.dispatch('handleApiError', error);
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      setCurrentAction(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('QuizEditDetailsPage'));
        } else {
          this.currentAction = action;
        }
      },
      closeModal() {
        this.currentAction = '';
      },
      handleSubmitCopy({ classroomId, groupIds, examTitle }) {
        const title = examTitle
          .trim()
          .substring(0, 50)
          .trim();

        const className = find(this.classList, { id: classroomId }).name;

        return this.$store
          .dispatch('examReport/copyExam', {
            exam: {
              collection: classroomId,
              title,
              question_count: this.quiz.question_count,
              question_sources: this.quiz.question_sources,
              assignments: serverAssignmentPayload(groupIds, this.classId),
            },
            className,
          })
          .then(result => {
            // If exam was copied to the current classroom, add it to the classSummary module
            if (classroomId === this.classId) {
              const object = {
                id: result.id,
                title: result.title,
                groups: clientAssigmentState(groupIds, this.classId),
                active: false,
              };
              this.$store.commit('classSummary/CREATE_ITEM', {
                map: 'examMap',
                id: object.id,
                object,
              });
            }
            this.closeModal();
          })
          .catch(error => {
            const caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (caughtErrors) {
              this.$store.commit('CORE_CREATE_SNACKBAR', {
                text: this.$tr('uniqueTitleError', {
                  title,
                  className,
                }),
                autoDismiss: false,
                actionText: this.common$tr('closeAction'),
                actionCallback: () => this.$store.commit('CORE_CLEAR_SNACKBAR'),
              });
            } else {
              this.$store.dispatch('handleApiError', error);
            }
            this.$store.dispatch('notLoading');
            this.closeModal();
          });
      },
      handleSubmitDelete() {
        return deleteExam(this.quiz.id)
          .then(() => {
            this.$store.commit('classSummary/DELETE_ITEM', { map: 'examMap', id: this.quiz.id });
            this.$router.replace(this.$router.getRoute('EXAMS'), () => {
              this.$store.dispatch(
                'createSnackbar',
                this.$tr('quizDeletedNotification', { title: this.quiz.title })
              );
            });
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
    },
    $trs: {
      pageLoadingError: 'There was a problem loading this quiz',
      allQuizzes: 'All quizzes',
      quizDeletedNotification: `'{title}' was deleted`,
      uniqueTitleError: `A quiz titled '{title}' already exists in '{className}'`,
    },
  };

</script>


<style lang="scss" scoped>

  // HACK: to prevent perseus multi-choice tiles from appearing
  // over modal overlay and snackbar
  /deep/ .perseus-radio-selected {
    z-index: 0 !important;
  }

</style>
