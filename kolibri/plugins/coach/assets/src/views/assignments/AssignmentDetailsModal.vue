<template>

  <core-modal
    :title="modalTitle"
    @cancel="closeModal()"
    :hasError="showServerError || !formIsValid"
    width="400px"
  >
    <ui-alert
      v-if="showServerError"
      type="error"
      :dismissible="false"
    >
      {{ submitErrorMessage }}
    </ui-alert>

    <form @submit.prevent="submitData">
      <k-textbox
        @blur="titleIsVisited = true"
        ref="titleField"
        :label="$tr('title')"
        :maxlength="50"
        :autofocus="true"
        :invalid="titleIsInvalid"
        :invalidText="titleIsInvalidText"
        v-model="title"
        :disabled="formIsSubmitted"
      />
      <k-textbox
        v-if="showDescriptionField"
        :label="$tr('description')"
        :maxlength="200"
        v-model="description"
        :disabled="formIsSubmitted"
      />

      <fieldset>
        <legend>{{ $tr('recipients') }}</legend>
        <recipient-selector
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
          :disabled="formIsSubmitted"
        />
      </fieldset>

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          appearance="flat-button"
          @click="closeModal()"
        />
        <k-button
          :text="isInEditMode ? $tr('save') : $tr('continue')"
          type="submit"
          :primary="true"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import xor from 'lodash/xor';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import UiAlert from 'keen-ui/src/UiAlert';
  import RecipientSelector from './RecipientSelector';

  export default {
    name: 'assignmentDetailsModal',
    components: {
      coreModal,
      kButton,
      kTextbox,
      RecipientSelector,
      UiAlert,
    },
    props: {
      modalTitle: {
        type: String,
        required: true,
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
    },
    data() {
      return {
        // set default values
        title: this.initialTitle,
        description: this.initialDescription,
        selectedCollectionIds: this.initialSelectedCollectionIds,
        titleIsVisited: false,
        formIsSubmitted: false,
        showServerError: false,
      };
    },
    computed: {
      formData() {
        return {
          title: this.title,
          description: this.description,
          assignments: this.selectedCollectionIds.map(groupId => ({ collection: groupId })),
        };
      },
      titleIsInvalidText() {
        // submission is handled because "blur" event happens on submit
        if (this.titleIsVisited) {
          if (this.title === '') {
            return this.$tr('required');
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
      lessonDetailsHaveChanged() {
        return (
          this.initialTitle !== this.title ||
          this.initialDescription !== this.description ||
          this.groupsHaveChanged
        );
      },
    },
    methods: {
      submitData() {
        this.showServerError = false;
        // Return immediately if "submit" has already been clicked
        if (this.formIsSubmitted) {
          // IDEA a loading indictor or something would probably be handy
          return;
        }

        if (this.formIsValid) {
          this.formIsSubmitted = true;
          if (!this.lessonDetailsHaveChanged) {
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
      // NOTE: this method is not used inside the method, but may be called
      // from a parent component
      handleSubmitFailure() {
        this.formIsSubmitted = false;
        this.showServerError = true;
      },
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      description: 'Description',
      required: 'This is required',
      save: 'Save',
      title: 'Title',
      recipients: 'Recipients',
    },
  };

</script>


<style lang="stylus" scoped>

  fieldset
    border: none
    margin: 0
    padding: 0

  legend
    padding-top: 16px
    padding-bottom: 8px

</style>
