<template>

  <div>
    <form @submit.prevent="submitData">
      <UiAlert
        v-if="showServerError"
        type="error"
        :dismissible="false"
      >
        {{ submitErrorMessage }}
      </UiAlert>

      <fieldset>
        <KTextbox
          ref="titleField"
          v-model="title"
          :label="coachString('titleLabel')"
          :maxlength="50"
          :autofocus="true"
          :invalid="titleIsInvalid"
          :invalidText="titleIsInvalidText"
          :disabled="disabled || formIsSubmitted"
          @blur="titleIsVisited = true"
          @input="showTitleError = false"
          @keydown.enter="submitData"
        />

        <KTextbox
          v-if="showDescriptionField"
          v-model="description"
          :label="coachString('descriptionLabel')"
          :maxlength="200"
          :disabled="disabled || formIsSubmitted"
          :textArea="true"
        />
      </fieldset>

      <fieldset>
        <legend>
          {{ coachString('recipientsLabel') }}
        </legend>
        <RecipientSelector
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
          :disabled="disabled || formIsSubmitted"
          :initialAdHocLearners="initialAdHocLearners"
          @updateLearners="learners => adHocLearners = learners"
        />
      </fieldset>

      <slot name="resourceTable"></slot>
    </form>

    <BottomAppBar>
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
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import RecipientSelector from './RecipientSelector';

  export default {
    name: 'AssignmentDetailsModal',
    components: {
      BottomAppBar,
      RecipientSelector,
      UiAlert,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      modalTitleErrorMessage: {
        type: String,
        default: null,
      },
      submitErrorMessage: {
        type: String,
        required: true,
      },
      initialTitle: {
        type: String,
        required: true,
      },
      initialDescription: {
        type: String,
        required: false,
        default: null,
      },
      initialSelectedCollectionIds: {
        type: Array,
        required: true,
      },
      initialAdHocLearners: {
        type: Array,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
      initialActive: {
        type: Boolean,
        required: false,
      },
      // If set to true, all of the forms are disabled
      disabled: {
        type: Boolean,
        default: false,
      },
      // Should be 'quiz', 'lesson', or 'new_lesson'
      assignmentType: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        // set default values
        title: this.initialTitle,
        description: this.initialDescription,
        selectedCollectionIds: this.initialSelectedCollectionIds,
        activeIsSelected: this.initialActive,
        adHocLearners: this.initialAdHocLearners,
        titleIsVisited: false,
        formIsSubmitted: false,
        showServerError: false,
        showTitleError: false,
      };
    },
    computed: {
      titleIsInvalidText() {
        // submission is handled because "blur" event happens on submit
        if (!this.disabled && !this.formIsSubmitted && this.titleIsVisited) {
          if (this.title === '') {
            return this.coreString('requiredFieldError');
          }
          if (this.assignmentIsQuiz) {
            if (
              this.$store.getters['classSummary/quizTitleUnavailable']({
                title: this.title,
                excludeId: this.$route.params.quizId,
              })
            ) {
              return this.coachString('quizDuplicateTitleError');
            }
          } else {
            if (
              this.$store.getters['classSummary/lessonTitleUnavailable']({
                title: this.title,
                excludeId: this.$route.params.lessonId,
              })
            ) {
              return this.coachString('lessonDuplicateTitleError');
            }
          }
          if (this.showTitleError) {
            return this.modalTitleErrorMessage;
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
          this.$emit('submit', {
            title: this.title,
            description: this.description,
            assignments: this.selectedCollectionIds,
            active: this.activeIsSelected,
            learner_ids: this.adHocLearners,
          });
        } else {
          this.formIsSubmitted = false;
          this.$refs.titleField.focus();
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
      },
    },
  };

</script>


<style lang="scss" scoped>

  fieldset {
    padding: 0;
    margin: 24px 0;
    border: 0;
  }

  legend {
    font-size: 16px;
    font-weight: bold;
  }

</style>
