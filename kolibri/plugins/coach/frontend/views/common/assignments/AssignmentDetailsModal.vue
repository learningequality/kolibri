<template>

  <div>
    <form @submit.prevent="submitData">
      <UiAlert
        v-if="showServerError"
        type="error"
        :dismissible="true"
        @dismiss="showServerError = false"
      >
        {{ submitErrorMessage }}
      </UiAlert>

      <!--
        TODO: Refactor or rename this component, setting a title or a description
        is not part of an "assignment" process (?)
      -->
      <fieldset>
        <KGrid>
          <KGridItem
            :layout4="{ span: 1 }"
            :layout8="{ span: 1 }"
            :layout12="{ span: 1 }"
          >
            <KIcon
              :icon="iconName"
              class="style-icon"
            />
          </KGridItem>

          <KGridItem
            :layout4="{ span: 3 }"
            :layout8="{ span: assignmentIsQuiz ? 3 : 7 }"
            :layout12="{ span: assignmentIsQuiz ? 5 : 11 }"
          >
            <KTextbox
              ref="titleField"
              v-model.trim="title"
              :label="titleLabel$()"
              :maxlength="titleMaxLength"
              :autofocus="true"
              :invalid="titleIsInvalid"
              :invalidText="titleIsInvalidText"
              :showInvalidText="titleIsInvalid"
              :disabled="disabled || formIsSubmitted"
              :class="{ 'textbox-lg': windowIsLarge }"
              @input="showTitleError = false"
              @keydown.enter="submitData"
            />
          </KGridItem>
          <template v-if="assignmentIsQuiz">
            <KGridItem
              :layout4="{ span: 1 }"
              :layout8="{ span: 1, alignment: 'left' }"
              :layout12="{ span: 1, alignment: 'left' }"
            >
              <br >
            </KGridItem>
            <KGridItem
              :layout4="{ span: 3 }"
              :layout8="{ span: 3 }"
              :layout12="{ span: 5 }"
            >
              <KSelect
                :label="reportVisibilityLabel$()"
                :options="reportVisibilityOptions"
                :value="reportVisibilityValue"
                :help="
                  instantReportVisibility
                    ? afterLearnerSubmitsQuizDescription$()
                    : afterCoachEndsQuizDescription$()
                "
                :class="['visibility-score-select', windowIsSmall ? 'select-sm' : 'select-lg']"
                @change="option => (instantReportVisibility = option.value)"
              />
            </KGridItem>
          </template>
          <!--Align with the title input-->
          <KGridItem
            :layout4="{ span: 1 }"
            :layout8="{ span: 1 }"
            :layout12="{ span: 1 }"
          >
            <div></div>
          </KGridItem>
          <KGridItem
            :layout4="{ span: 3 }"
            :layout8="{ span: 7 }"
            :layout12="{ span: 11 }"
          >
            <KTextbox
              v-if="showDescriptionField"
              v-model="description"
              :label="descriptionLabel$()"
              :maxlength="200"
              :disabled="disabled || formIsSubmitted"
              :textArea="true"
              :class="{ 'textbox-lg': windowIsLarge }"
            />
          </KGridItem>
        </KGrid>
      </fieldset>

      <fieldset>
        <!--
          TODO: Make this collapsible inside an Accordion component
          if this is a quiz
          when collapsed display this:
          <Recipients
            :groupNames="getRecipientNamesForExam(quiz)"
            :hasAssignments="quiz.assignments.length > 0"
          />
        -->
        <legend>
          {{ recipientsLabel$() }}
        </legend>

        <SidePanelRecipientsSelector
          v-if="selectRecipientsWithSidePanel"
          ref="recipientsSelector"
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
          :disabled="disabled || formIsSubmitted"
          :adHocLearners.sync="adHocLearners"
          :selectedCollectionIds.sync="selectedCollectionIds"
        />
        <RecipientSelector
          v-else
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
          :disabled="disabled || formIsSubmitted"
          :initialAdHocLearners="adHocLearners"
          @updateLearners="learners => (adHocLearners = learners)"
        />
      </fieldset>
    </form>

    <BottomAppBar v-if="!assignmentIsQuiz">
      <KButtonGroup>
        <KButton
          :text="coreString('cancelAction')"
          appearance="flat-button"
          :primary="false"
          :disabled="disabled || formIsSubmitted"
          @click="$emit('cancel')"
        />
        <KButton
          :text="coreString('saveChangesAction')"
          :primary="true"
          :disabled="disabled || formIsSubmitted"
          @click="submitData"
        />
      </KButtonGroup>
    </BottomAppBar>
  </div>

</template>


<script>

  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coachStrings } from '../../common/commonCoachStrings';
  import RecipientSelector from './RecipientSelector';
  import SidePanelRecipientsSelector from './SidePanelRecipientsSelector';

  export default {
    name: 'AssignmentDetailsModal',
    components: {
      BottomAppBar,
      RecipientSelector,
      UiAlert,
      SidePanelRecipientsSelector,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall, windowIsLarge } = useKResponsiveWindow();
      const {
        recipientsLabel$,
        descriptionLabel$,
        titleLabel$,
        saveLessonError$,
        saveQuizError$,
        quizDuplicateTitleError$,
        lessonDuplicateTitleError$,
        reportVisibilityLabel$,
        afterLearnerSubmitsQuizLabel$,
        afterCoachEndsQuizLabel$,
        afterLearnerSubmitsQuizDescription$,
        afterCoachEndsQuizDescription$,
      } = coachStrings;
      return {
        windowIsSmall,
        windowIsLarge,
        recipientsLabel$,
        descriptionLabel$,
        titleLabel$,
        saveLessonError$,
        saveQuizError$,
        quizDuplicateTitleError$,
        lessonDuplicateTitleError$,
        reportVisibilityLabel$,
        afterLearnerSubmitsQuizLabel$,
        afterCoachEndsQuizLabel$,
        afterLearnerSubmitsQuizDescription$,
        afterCoachEndsQuizDescription$,
      };
    },
    props: {
      /**
       * The assignment object to be edited
       * @type {Object}
       * @required
       * @example
       * {
       *  title: 'Assignment Title',
       *  description: 'Assignment Description',
       *  assignments: ['collection_id_1', 'collection_id_2'],
       *  active: true,
       *  learner_ids: ['learner_id_1', 'learner_id_2'],
       * }
       */
      assignment: {
        type: Object,
        required: true,
      },
      assignmentType: {
        type: String,
        required: true,
        validator: value => ['lesson', 'quiz'].includes(value),
      },
      classId: {
        type: String,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
      // If set to true, all of the forms are disabled
      disabled: {
        type: Boolean,
        default: false,
      },
      selectRecipientsWithSidePanel: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        // set default values
        title: this.assignment.title || '',
        description: this.assignment.description || '',
        selectedCollectionIds: this.assignment.assignments || [],
        activeIsSelected: this.assignment.active || false,
        adHocLearners: this.assignment.learner_ids || [],
        formIsSubmitted: false,
        showServerError: false,
        showTitleError: false,
        instantReportVisibility: this.assignment.instant_report_visibility,
      };
    },
    computed: {
      titleIsInvalidText() {
        // submission is handled because "blur" event happens on submit
        if (!this.disabled && !this.formIsSubmitted) {
          if (this.title === '' && this.showTitleError) {
            return this.coreString('requiredFieldError');
          }
          if (this.assignmentIsQuiz) {
            if (
              Boolean(
                this.$store.getters['classSummary/quizTitleUnavailable']({
                  title: this.title,
                  excludeId: this.$route.params.quizId,
                }),
              ) ||
              this.showTitleError
            ) {
              return this.quizDuplicateTitleError$();
            }
          } else {
            if (
              this.$store.getters['classSummary/lessonTitleUnavailable']({
                title: this.title,
                excludeId: this.$route.params.lessonId,
              }) ||
              this.showTitleError
            ) {
              return this.lessonDuplicateTitleError$();
            }
          }
        }
        return '';
      },
      assignmentIsQuiz() {
        return this.assignmentType === 'quiz';
      },
      showDescriptionField() {
        // Quizzes don't have descriptions
        return !this.assignmentIsQuiz;
      },
      titleIsInvalid() {
        return Boolean(this.titleIsInvalidText);
      },
      formIsValid() {
        return !this.titleIsInvalid;
      },
      titleMaxLength() {
        if (this.assignmentIsQuiz) {
          return 100;
        }
        return 50;
      },
      submitErrorMessage() {
        return this.assignmentIsQuiz ? this.saveQuizError$() : this.saveLessonError$();
      },
      iconName() {
        return this.assignmentIsQuiz ? 'quiz' : 'lesson';
      },
      submitObject() {
        return {
          title: this.title,
          description: this.description,
          assignments: this.selectedCollectionIds,
          active: this.activeIsSelected,
          learner_ids: this.adHocLearners,
          instant_report_visibility: this.instantReportVisibility,
        };
      },
      reportVisibilityOptions() {
        return [
          { label: this.afterLearnerSubmitsQuizLabel$(), value: true },
          { label: this.afterCoachEndsQuizLabel$(), value: false },
        ];
      },
      reportVisibilityValue() {
        return (
          this.reportVisibilityOptions.find(
            option => option.value === this.instantReportVisibility,
          ) || {}
        );
      },
    },
    watch: {
      title() {
        this.$emit('update', { title: this.title });
      },
      description() {
        this.$emit('update', { description: this.description });
      },
      selectedCollectionIds() {
        this.$emit('update', { assignments: this.selectedCollectionIds });
      },
      adHocLearners() {
        this.$emit('update', { learner_ids: this.adHocLearners });
      },
      instantReportVisibility() {
        this.$emit('update', { instant_report_visibility: this.instantReportVisibility });
      },
      submitObject() {
        if (this.showServerError) {
          this.$nextTick(() => {
            this.validate(false);
          });
        }
      },
    },
    methods: {
      submitData() {
        this.showServerError = false;
        this.showTitleError = false;

        // Return immediately if "submit" has already been clicked
        if (this.disabled) {
          return;
        }

        // TODO: Add error handling & snackbar message that notifies user when they have
        // selected ONLY the AdHoc Learners Group, but selects no learners
        // For now - if the only thing selected is AdHoc Learners but there
        // are no learners actually selected, pretend they selected Entire class
        // NOT DONE due to this being 0.13.0 post string freeze.
        // Create an issue for this and it'll be a quick fix in 0.13.1
        if (this.selectedCollectionIds.length === 0 && this.adHocLearners.length === 0) {
          this.selectedCollectionIds.push(this.classId);
        }

        if (this.formIsValid) {
          this.formIsSubmitted = true;
          this.$emit('submit', this.submitObject);
        } else {
          this.formIsSubmitted = false;
        }
      },
      /**
       * @public
       */
      handleSubmitFailure() {
        this.formIsSubmitted = false;
        this.showServerError = true;
      },
      /**
       * @public
       */
      handleSubmitTitleFailure() {
        this.formIsSubmitted = false;
        this.showTitleError = true;
        this.$refs.titleField.focus();
        // Scroll to the title field in case focus() didn't do that immediately
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      /**
       * @public
       */
      handleSubmitSuccess() {
        this.showTitleError = false;
        this.showServerError = false;
      },
      /**
       * @public
       */
      validate(handleFailure = true) {
        let error = '';
        this.showServerError = false;
        // Validate title
        if (this.title === '') {
          if (handleFailure) {
            this.handleSubmitTitleFailure();
          }
          error = this.coreString('requiredFieldError');
        }

        // Validate recipients
        const recipientsError = this.$refs.recipientsSelector?.validate();
        if (!error && recipientsError) {
          error = recipientsError;
          if (handleFailure) {
            this.$refs.recipientsSelector?.handleSubmitRecipientsFailure();
          }
        }

        if (error) {
          this.showServerError = true;
        }

        return error;
      },
    },
  };

</script>


<style lang="scss" scoped>

  /deep/ .ui-textbox-label {
    width: 100% !important;
  }

  /deep/ .textbox {
    width: 100% !important;
    max-width: 100%;
  }

  /deep/ .ui-select-feedback {
    background: #ffffff !important;
  }

  /deep/ .ui-select-label {
    background: #f5f5f5;
    border-bottom-color: #666666;
    border-bottom-style: solid;
    border-bottom-width: 1px;
  }

  .visibility-score-select {
    border-bottom: 0 !important;
  }

  .style-icon {
    width: 2em;
    height: 2em;
    margin-top: 0.5em;
    margin-left: 1em;
  }

  .checkmark-style-icon {
    width: 2em;
    height: 2em;
    margin-top: 0.5em;
    margin-left: -1em;
  }

  fieldset {
    padding: 0;
    margin: 24px 0;
    border: 0;
  }

  legend {
    font-size: 16px;
    font-weight: bold;
  }

  .textbox-lg {
    margin-left: -1em;
  }

  .select-sm {
    margin-left: -1em;
  }

  .select-lg {
    margin-left: -3em;
  }

</style>
