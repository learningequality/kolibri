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
          :assignmentType="assignmentType"
          :initialIndividualLearners="initialIndividualLearners"
          @updateLearners="learners => individualLearners = learners"
        />
      </fieldset>

      <slot name="resourceTable"></slot>
    </form>

    <BottomAppBar v-if="assignmentType !== 'new_lesson'">
      <KButton
        :text="coreString('cancelAction')"
        appearance="flat-button"
        :primary="false"
        :disabled="disabled"
        @click="$emit('cancel')"
      />
      <KButton
        :text="coreString('saveChangesAction')"
        :primary="true"
        :disabled="disabled"
        @click="submitData"
      />
    </BottomAppBar>
  </div>

</template>


<script>

  import xor from 'lodash/xor';
  import UiAlert from 'keen-ui/src/UiAlert';
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
        required: false,
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
      initialIndividualLearners: {
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
        individualLearners: this.initialIndividualLearners,
        titleIsVisited: false,
        formIsSubmitted: false,
        showServerError: false,
        showTitleError: false,
      };
    },
    computed: {
      formData() {
        return {
          title: this.title,
          description: this.description,
          assignments: this.selectedCollectionIds.map(groupId => ({ collection: groupId })),
          active: this.activeIsSelected,
        };
      },
      titleIsInvalidText() {
        // submission is handled because "blur" event happens on submit
        if (!this.disabled && this.titleIsVisited) {
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
      groupsHaveChanged() {
        const unsharedIds = xor(this.selectedCollectionIds, this.initialSelectedCollectionIds);
        return unsharedIds.length > 0;
      },
      detailsHaveChanged() {
        return (
          this.initialTitle !== this.title ||
          this.initialDescription !== this.description ||
          this.groupsHaveChanged ||
          this.initialActive !== this.activeIsSelected
        );
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
        // Quizzes require handling of the invidiual learners
        // So we split how they're handled here.
        if (this.assignmentType === 'quiz') {
          this.submitQuizData();
        } else {
          this.submitLessonData();
        }
      },
      submitQuizData() {
        // TODO: Add error handling & snackbar message that notifies user when they have
        // selected ONLY the Individual Learners Group, but selects no learners
        // For now - if the only thing selected is Individual Learners but there
        // are no learners actually selected, pretend they selected Entire class
        // NOT DONE due to this being 0.13.0 post string freeze.
        // Create an issue for this and it'll be a quick fix in 0.13.1
        if (
          this.selectedCollectionIds.length === 1 &&
          this.selectedCollectionIds.includes(this.$store.state.individualLearners.id) &&
          this.individualLearners.length === 0
        ) {
          this.selectedCollectionIds.push(this.classId);
        }

        // Always make sure that we're including the individualLearnersGroup ID in this
        // or else we'll delete the assignment and lose the collection.
        if (!this.selectedCollectionIds.includes(this.$store.state.individualLearners.id)) {
          // The selected individual learners should be cleared out in this case as well.
          this.individualLearners = [];
          this.selectedCollectionIds.push(this.$store.state.individualLearners.id);
        }

        // Update the users associated with the IndividualLearnersGroup then proceed
        // with form submission
        this.$store
          .dispatch('individualLearners/updateIndividualLearnersGroup', this.individualLearners)
          .then(() => {
            if (this.formIsValid) {
              if (!this.detailsHaveChanged) {
                this.$emit('submit', null);
              } else {
                this.$emit('submit', this.formData);
              }
            } else {
              this.formIsSubmitted = false;
              this.$refs.titleField.focus();
            }
          })
          .catch(() => {
            this.handleSubmitFailure();
          });
      },
      submitLessonData() {
        if (this.formIsValid) {
          if (!this.detailsHaveChanged) {
            this.$emit('submit', null);
          } else {
            this.$emit('submit', this.formData);
          }
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
