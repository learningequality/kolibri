<template>

  <CoachImmersivePage
    :appBarTitle="title"
    icon="close"
    :pageTitle="title"
    :route="backRoute"
  >
    <UiAlert
      v-if="showError && !inSearchMode"
      type="error"
      :dismissible="false"
    >
      {{ selectionIsInvalidText }}
    </UiAlert>

    <KPageContainer :style="{ maxWidth: '1000px', margin: '0 auto 2em', paddingTop: '2rem' }">
      <AssignmentDetailsModal
        v-if="quizInitialized"
        ref="detailsModal"
        assignmentType="quiz"
        :selectRecipientsWithSidePanel="true"
        :assignment="quiz"
        :classId="classId"
        :groups="groups"
        @update="updateQuiz"
      />

      <div v-if="quizInitialized">
        <h5 class="section-order-header">
          {{ sectionOrderLabel$() }}
        </h5>
        <KGrid>
          <KRadioButtonGroup>
            <KGridItem
              :layout12="{ span: 6 }"
              :layout8="{ span: 4 }"
              :layout4="{ span: 2 }"
            >
              <KRadioButton
                :currentValue="quiz.learners_see_fixed_order"
                :label="randomizedLabel$()"
                :buttonValue="false"
                :description="randomizedSectionOptionDescription$()"
                @input="value => updateQuiz({ learners_see_fixed_order: value })"
              />
            </KGridItem>
            <KGridItem
              :layout12="{ span: 6 }"
              :layout8="{ span: 4 }"
              :layout4="{ span: 2 }"
            >
              <KRadioButton
                :currentValue="quiz.learners_see_fixed_order"
                :label="fixedLabel$()"
                :buttonValue="true"
                :description="fixedSectionOptionDescription$()"
                @input="value => updateQuiz({ learners_see_fixed_order: value })"
              />
              <KButton
                v-if="quiz.learners_see_fixed_order"
                :text="coreString('editAction') + ' - ' + sectionOrderLabel$()"
                class="edit-section-order-btn"
                appearance="basic-link"
                @click="editSectionOrder"
              />
            </KGridItem>
          </KRadioButtonGroup>
        </KGrid>
      </div>

      <CreateQuizSection v-if="quizInitialized && quiz.draft" />

      <BottomAppBar>
        <span
          v-if="allSectionsEmpty"
          class="message"
        >
          {{ allSectionsEmptyWarning$() }}
        </span>
        <KButtonGroup>
          <KButton
            :text="coreString('saveAction')"
            :disabled="allSectionsEmpty"
            @click="() => saveQuizAndRedirect(false)"
          />
          <KButton
            :text="saveAndClose$()"
            primary
            :disabled="allSectionsEmpty"
            @click="() => saveQuizAndRedirect()"
          />
        </KButtonGroup>
      </BottomAppBar>
    </KPageContainer>

    <KModal
      v-if="closeConfirmationToRoute"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      :title="closeConfirmationTitle$()"
      @cancel="closeConfirmationToRoute = null"
      @submit="$router.push(closeConfirmationToRoute)"
    >
      {{ closeConfirmationMessage$() }}
    </KModal>

    <SectionSidePanel v-if="quizInitialized" />
  </CoachImmersivePage>

</template>


<script>

  import get from 'lodash/get';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import { ref } from 'vue';
  import pickBy from 'lodash/pickBy';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { PageNames } from '../../../constants';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import useQuizCreation from '../../../composables/useQuizCreation';
  import AssignmentDetailsModal from '../../common/assignments/AssignmentDetailsModal';
  import useCoreCoach from '../../../composables/useCoreCoach';
  import CreateQuizSection from './CreateQuizSection';
  import SectionSidePanel from './SectionSidePanel';

  export default {
    name: 'CreateExamPage',
    components: {
      CoachImmersivePage,
      BottomAppBar,
      CreateQuizSection,
      AssignmentDetailsModal,
      SectionSidePanel,
    },
    mixins: [commonCoreStrings],
    setup() {
      const closeConfirmationToRoute = ref(null);
      const { createSnackbar } = useSnackbar();
      const { classId, groups } = useCoreCoach();
      const {
        quizHasChanged,
        quiz,
        updateQuiz,
        saveQuiz,
        initializeQuiz,
        allSectionsEmpty,
        allSections,
      } = useQuizCreation();
      const showError = ref(false);
      const quizInitialized = ref(false);

      const {
        saveAndClose$,
        allSectionsEmptyWarning$,
        closeConfirmationTitle$,
        closeConfirmationMessage$,
        changesSavedSuccessfully$,
        sectionOrderLabel$,
        randomizedLabel$,
        fixedLabel$,
        randomizedSectionOptionDescription$,
        fixedSectionOptionDescription$,
      } = enhancedQuizManagementStrings;

      return {
        closeConfirmationTitle$,
        closeConfirmationMessage$,
        classId,
        groups,
        closeConfirmationToRoute,
        showError,
        quiz,
        quizHasChanged,
        saveQuiz,
        updateQuiz,
        initializeQuiz,
        quizInitialized,
        allSections,
        allSectionsEmpty,
        allSectionsEmptyWarning$,
        saveAndClose$,
        changesSavedSuccessfully$,
        sectionOrderLabel$,
        randomizedLabel$,
        fixedLabel$,
        randomizedSectionOptionDescription$,
        fixedSectionOptionDescription$,
        createSnackbar,
      };
    },
    provide() {
      return {
        showError: this.showError,
        moreResultsState: null,
        // null corresponds to 'All' filter value
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        // numQuestionsBlurred: false,
        bookmarksCount: 0,
        bookmarks: [],
        more: null,
        // showSectionSettingsMenu:false
      };
    },
    computed: {
      backRoute() {
        const lastRoute = get(this.$route, ['query', 'last']);
        if (lastRoute) {
          const params = { ...this.$route.query };
          delete params.last;
          return {
            name: lastRoute,
            params,
          };
        }
        return { name: PageNames.EXAMS_ROOT, params: { classId: this.classId } };
      },
      title() {
        if (!this.quizInitialized) {
          return '';
        }
        if (this.$route.params.quizId === 'new') {
          return this.$tr('createNewExamLabel');
        }
        return this.quiz.title;
      },
    },
    watch: {
      filters(newVal) {
        this.$router.push({
          query: { ...this.$route.query, ...pickBy(newVal) },
        });
      },
    },
    beforeRouteEnter(to, from, next) {
      // If we're coming from no quizId and going to replace questions, redirect to exam creation
      // then we're coming from another page altogether OR we're coming back from a refresh
      if (!from.params?.quizId && to.name === PageNames.QUIZ_REPLACE_QUESTIONS) {
        next({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: to.params.classId,
            quizId: to.params.quizId,
          },
        });
      } else {
        next();
      }
    },
    beforeRouteUpdate(to, from, next) {
      if (
        to.name === PageNames.QUIZ_SELECT_PRACTICE_QUIZ &&
        from.name === PageNames.EXAM_CREATION_ROOT
      ) {
        this.closeConfirmationToRoute = {
          name: PageNames.EXAMS_ROOT,
          params: {
            classId: to.params.classId,
          },
        };
        next(false);
        return;
      }
      if (to.params.sectionIndex >= this.allSections.length) {
        next({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: to.params.classId,
            quizId: to.params.quizId,
            sectionIndex: '0',
          },
        });
      } else {
        next();
      }
    },
    beforeRouteLeave(to, from, next) {
      if (this.quizHasChanged && !this.closeConfirmationToRoute) {
        this.closeConfirmationToRoute = to;
        next(false);
      } else {
        next();
      }
    },
    mounted() {
      this.$store.dispatch('notLoading');
    },
    async created() {
      window.addEventListener('beforeunload', this.beforeUnload);
      await this.initializeQuiz(this.$route.params.classId, this.$route.params.quizId);
      // If the section index doesn't exist, redirect to the first section; we also do this in
      // beforeRouteUpdate. We do this here to avoid fully initializing the quiz if we're going to
      // redirect anyway.
      if (this.$route.params.sectionIndex >= this.allSections.length) {
        this.$router.replace({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: this.$route.params.classId,
            quizId: this.$route.params.quizId,
            sectionIndex: '0',
          },
        });
      }
      this.quizInitialized = true;
    },
    destroy() {
      window.removeEventListener('beforeunload', this.beforeUnload);
    },
    methods: {
      editSectionOrder() {
        this.$router.push({
          name: PageNames.QUIZ_SECTION_ORDER,
          params: {
            classId: this.$route.params.classId,
            quizId: this.$route.params.quizId,
            sectionIndex: this.$route.params.sectionIndex,
          },
        });
      },
      beforeUnload(e) {
        if (this.quizHasChanged) {
          if (!window.confirm(this.closeConfirmationTitle$())) {
            e.preventDefault();
          }
        }
      },
      saveQuizAndRedirect(close = true) {
        const errorText = this.$refs.detailsModal.validate();
        if (errorText) {
          return;
        }
        this.saveQuiz()
          .then(exam => {
            this.$refs.detailsModal.handleSubmitSuccess();
            this.createSnackbar(this.changesSavedSuccessfully$());
            if (close) {
              this.$router.replace({
                name: PageNames.EXAMS_ROOT,
                params: {
                  classId: this.$route.params.classId,
                },
                query: {
                  snackbar: this.changesSavedSuccessfully$(),
                },
              });
            } else {
              if (String(this.$route.params.quizId) === String(exam.id)) {
                return;
              }
              this.$router.replace({
                name: PageNames.EXAM_CREATION_ROOT,
                params: {
                  classId: this.$route.params.classId,
                  quizId: exam.id,
                  sectionIndex: this.$route.params.sectionIndex,
                },
              });
            }
          })
          .catch(error => {
            const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE, 'BLANK']);
            this.$refs.detailsModal.handleSubmitFailure();
            if (errors.length) {
              this.$refs.detailsModal.handleSubmitTitleFailure();
            }
          });
      },
    },
    $trs: {
      createNewExamLabel: {
        message: 'Create new quiz',
        context: "Title of the screen launched from the 'New quiz' button on the 'Plan' tab.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .message {
    margin-right: 8px;
  }

  .section-order-header {
    margin-top: 0;
    margin-bottom: 0.5em;
  }

  .edit-section-order-btn {
    margin-left: 2em;
  }

</style>
