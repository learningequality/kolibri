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
        />

        <KTextbox
          v-if="showDescriptionField"
          v-model="description"
          :label="$tr('description')"
          :maxlength="200"
          :disabled="disabled || formIsSubmitted"
        />
      </fieldset>

      <fieldset v-if="showActiveOption">
        <legend>
          {{ coachStrings.$tr('statusLabel') }}
        </legend>
        <p>
          {{ $tr('activeQuizzesExplanation') }}
        </p>
        <KRadioButton
          v-model="activeIsSelected"
          :label="modalActiveText"
          :value="true"
          :disabled="disabled || formIsSubmitted"
        />
        <KRadioButton
          v-model="activeIsSelected"
          :label="modalInactiveText"
          :value="false"
          :disabled="disabled || formIsSubmitted"
        />
      </fieldset>

      <fieldset>
        <legend>
          {{ $tr('assignedGroupsLabel') }}
        </legend>
        <RecipientSelector
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
          :disabled="disabled || formIsSubmitted"
        />
      </fieldset>
    </form>

    <Bottom>
      <KButton
        :text="coachStrings.$tr('cancelAction')"
        appearance="flat-button"
        :primary="false"
        :disabled="disabled"
        @click="$emit('cancel')"
      />
      <KButton
        :text="coachStrings.$tr('saveChangesAction')"
        :primary="true"
        :disabled="disabled"
        @click="submitData"
      />
    </Bottom>
  </div>

</template>


<script>

  import xor from 'lodash/xor';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import Bottom from '../CreateExamPage/Bottom';
  import RecipientSelector from './RecipientSelector';

  export default {
    name: 'AssignmentDetailsModal',
    components: {
      Bottom,
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
      showDescriptionField: {
        type: Boolean,
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
      showActiveOption: {
        type: Boolean,
        default: false,
      },
      initialActive: {
        type: Boolean,
        required: false,
      },
      modalActiveText: {
        type: String,
        required: false,
      },
      modalInactiveText: {
        type: String,
        required: false,
      },
      // If set to true, all of the forms are disabled
      disabled: {
        type: Boolean,
        default: false,
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
        if (this.titleIsVisited) {
          if (this.title === '') {
            return this.$tr('fieldRequiredErro');
          }
          if (
            this.$store.getters['classSummary/quizTitleUnavailable']({
              title: this.title,
              excludeId: this.$route.params.quizId,
            })
          ) {
            return this.$tr('quizTitleAlreadyUsed');
          }
          if (this.showTitleError) {
            return this.modalTitleErrorMessage;
          }
        }
        return '';
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
      // NOTE: These methods are not used inside the component, but may be called
      // from a parent component
      handleSubmitFailure() {
        this.formIsSubmitted = false;
        this.showServerError = true;
      },
      handleSubmitTitleFailure() {
        this.formIsSubmitted = false;
        this.showTitleError = true;
      },
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      description: 'Description',
      fieldRequiredErro: 'This field is required',
      save: 'Save',
      titlePlaceholder: 'Title',
      assignedGroupsLabel: 'Visible to',
      activeQuizzesExplanation: 'Learners can only see active quizzes',
      quizTitleAlreadyUsed: 'A quiz with this name already exists',
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
