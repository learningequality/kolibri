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
          :label="$tr('titlePlaceholder')"
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
          :label="coachCommon$tr('descriptionLabel')"
          :maxlength="200"
          :disabled="disabled || formIsSubmitted"
          :textArea="true"
        />
      </fieldset>

      <fieldset v-if="assignmentType !== 'new_lesson'">
        <legend>
          {{ coachCommon$tr('statusLabel') }}
        </legend>
        <p>
          {{ assignmentStrings.statusExplanation }}
        </p>
        <KRadioButton
          v-model="activeIsSelected"
          :label="assignmentStrings.activeStatus"
          :value="true"
          :disabled="disabled || formIsSubmitted"
        />
        <KRadioButton
          v-model="activeIsSelected"
          :label="assignmentStrings.inactiveStatus"
          :value="false"
          :disabled="disabled || formIsSubmitted"
        />
      </fieldset>

      <fieldset>
        <legend>
          {{ coachCommon$tr('recipientsLabel') }}
        </legend>
        <RecipientSelector
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
          :disabled="disabled || formIsSubmitted"
        />
      </fieldset>

      <slot name="resourceTable"></slot>
    </form>

    <KBottomAppBar v-if="assignmentType !== 'new_lesson'">
      <KButton
        :text="coachCommon$tr('cancelAction')"
        appearance="flat-button"
        :primary="false"
        :disabled="disabled"
        @click="$emit('cancel')"
      />
      <KButton
        :text="coachCommon$tr('saveChangesAction')"
        :primary="true"
        :disabled="disabled"
        @click="submitData"
      />
    </KBottomAppBar>
  </div>

</template>


<script>

  import xor from 'lodash/xor';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import UiAlert from 'keen-ui/src/UiAlert';
  import KBottomAppBar from 'kolibri.coreVue.components.KBottomAppBar';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import RecipientSelector from './RecipientSelector';

  export default {
    name: 'AssignmentDetailsModal',
    components: {
      KBottomAppBar,
      KButton,
      KRadioButton,
      KTextbox,
      RecipientSelector,
      UiAlert,
    },
    mixins: [coachStringsMixin],
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
            return this.$tr('fieldRequiredError');
          }
          if (this.assignmentIsQuiz) {
            if (
              this.$store.getters['classSummary/quizTitleUnavailable']({
                title: this.title,
                excludeId: this.$route.params.quizId,
              })
            ) {
              return this.coachCommon$tr('quizDuplicateTitleError');
            }
          } else {
            if (
              this.$store.getters['classSummary/lessonTitleUnavailable']({
                title: this.title,
                excludeId: this.$route.params.lessonId,
              })
            ) {
              return this.coachCommon$tr('lessonDuplicateTitleError');
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
      assignmentStrings() {
        if (this.assignmentIsQuiz) {
          return {
            activeStatus: this.coachCommon$tr('quizActiveLabel'),
            inactiveStatus: this.coachCommon$tr('quizInactiveLabel'),
            statusExplanation: this.$tr('activeQuizzesExplanation'),
          };
        }
        return {
          activeStatus: this.coachCommon$tr('lessonActiveLabel'),
          inactiveStatus: this.coachCommon$tr('lessonInactiveLabel'),
          statusExplanation: this.$tr('activeLessonsExplanation'),
        };
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
    $trs: {
      fieldRequiredError: 'This field is required',
      titlePlaceholder: 'Title',
      activeQuizzesExplanation: 'Learners can only see active quizzes',
      activeLessonsExplanation: 'Learners can only see active lessons',
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
    font-size: 18px;
    font-weight: bold;
  }

</style>
