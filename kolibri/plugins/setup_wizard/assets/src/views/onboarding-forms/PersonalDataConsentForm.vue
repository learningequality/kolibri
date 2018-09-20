<template>

  <div>
    <OnboardingForm
      :header="$tr('header')"
      :description="$tr('description')"
      :submitText="submitText"
      @submit="$emit('submit')"
    >
      <KButton
        ref="modalButton"
        :text="$tr('viewStatementButton')"
        @click="showModal = true"
        appearance="basic-link"
      />

    </OnboardingForm>

    <KModal
      v-if="showModal"
      @cancel="closeModal"
      :cancelText="$tr('cancelButtonLabel')"
      size="medium"
      :title="$tr('privacyModalHeader')"
    >
      <!-- Place privacy statement texts here -->
      <div></div>
    </KModal>
  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import KModal from 'kolibri.coreVue.components.KModal';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'PersonalDataConsentForm',
    components: {
      KButton,
      KCheckbox,
      KModal,
      OnboardingForm,
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showModal: false,
      };
    },
    mounted() {
      this.focusOnModalButton();
    },
    methods: {
      closeModal() {
        this.focusOnModalButton();
        this.showModal = false;
      },
      // HACK need to manually refocus on button/form after closing modal
      focusOnModalButton() {
        this.$nextTick().then(() => {
          const { modalButton } = this.$refs;
          if (modalButton.$refs.button) {
            modalButton.$refs.button.focus();
          }
        });
      },
    },
    $trs: {
      acceptanceCheckboxLabel:
        'I accept the statement on how Learning Equality handles personal data.',
      cancelButtonLabel: 'Close',
      description:
        'If you are setting up Kolibri to be used by other users, you or someone you delegate will be responsible for protecting and managing the user accounts and personal information stored on this device.',
      header: 'Responsibilities as an administrator',
      privacyModalHeader: 'Usage and privacy',
      viewStatementButton: 'View statement',
    },
  };

</script>


<style lang="scss" scoped></style>
