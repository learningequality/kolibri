<template>

  <KModal
    :title="modalTitle"
    :hasError="showServerError || !formIsValid"
    :submitText="isInEditMode ? $tr('save') : $tr('continue')"
    :cancelText="$tr('cancel')"
    @submit="submitData"
    @cancel="closeModal"
  >
    <UiAlert
      v-if="showServerError"
      type="error"
      :dismissible="false"
    >
      {{ submitErrorMessage }}
    </UiAlert>
    <KTextbox
      ref="titleField"
      v-model="title"
      :label="$tr('titlePlaceholder')"
      :maxlength="50"
      :autofocus="true"
      :invalid="titleIsInvalid"
      :invalidText="titleIsInvalidText"
      :disabled="formIsSubmitted"
      @blur="titleIsVisited = true"
      @input="showTitleError = false"
    />
    <KTextbox
      v-if="showDescriptionField"
      v-model="description"
      :label="$tr('description')"
      :maxlength="200"
      :disabled="formIsSubmitted"
    />
    <fieldset v-if="showActiveOption">
      <legend>{{ coachStrings.$tr('statusLabel') }}</legend>
      <KRadioButton
        v-model="activeIsSelected"
        :label="modalActiveText"
        :value="true"
      />
      <KRadioButton
        v-model="activeIsSelected"
        :label="modalInactiveText"
        :value="false"
      />
    </fieldset>
    <fieldset>
      <legend>{{ $tr('assignedGroupsLabel') }}</legend>
      <RecipientSelector
        v-model="selectedCollectionIds"
        :groups="groups"
        :classId="classId"
        :disabled="formIsSubmitted"
      />
    </fieldset>
  </KModal>

</template>


<script>

  import xor from 'lodash/xor';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import RecipientSelector from './RecipientSelector';

  export default {
    name: 'AssignmentDetailsModal',
    components: {
      KModal,
      KTextbox,
      KRadioButton,
      RecipientSelector,
      UiAlert,
    },
    mixins: [coachStringsMixin],
    props: {
      modalTitle: {
        type: String,
        required: true,
      },
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
      isInEditMode: {
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
        if (this.formIsSubmitted) {
          // IDEA a loading indictor or something would probably be handy
          return;
        }

        if (this.formIsValid) {
          this.formIsSubmitted = true;
          if (!this.detailsHaveChanged) {
            this.closeModal();
            return;
          }

          return this.isInEditMode
            ? this.$emit('save', this.formData)
            : this.$emit('continue', this.formData);
        } else {
          // shouldn't ever be true, but being safe
          this.formIsSubmitted = false;
          this.$refs.titleField.focus();
        }
      },
      closeModal() {
        this.$emit('cancel');
      },
      /**
       * @public
       */
      // eslint-disable-next-line
      handleSubmitFailure() {
        this.formIsSubmitted = false;
        this.showServerError = true;
      },
      /**
       * @public
       */
      // eslint-disable-next-line
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
    },
  };

</script>


<style lang="scss" scoped>

  fieldset {
    padding: 0;
    margin: 0;
    border: 0;
  }

  legend {
    padding-top: 16px;
    padding-bottom: 8px;
  }

</style>
