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
        :text="$tr('moreInfo')"
        appearance="basic-link"
        @click="showModal = true"
      />
    </OnboardingForm>

    <PrivacyInfoModal
      v-if="showModal"
      hideUsersSection
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'PersonalDataConsentForm',
    components: {
      KButton,
      PrivacyInfoModal,
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
      description:
        'If you are setting up Kolibri to be used by other users, you or someone you delegate will be responsible for protecting and managing the user accounts and personal information stored on this device.',
      header: 'Responsibilities as an administrator',
      moreInfo: 'More information',
    },
  };

</script>


<style lang="scss" scoped></style>
