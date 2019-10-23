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
        :text="coreString('usageAndPrivacyLabel')"
        appearance="basic-link"
        @click="showModal = true"
      />
    </OnboardingForm>

    <PrivacyInfoModal
      v-if="showModal"
      hideUsersSection
      @cancel="closeModal"
      @submit="closeModal"
    />
  </div>

</template>


<script>

  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'PersonalDataConsentForm',
    components: {
      PrivacyInfoModal,
      OnboardingForm,
    },
    mixins: [commonCoreStrings],
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
            // HACK to prevent the modal from opening from an keyup.enter event from
            // previous form, we have to delay focusing the "More information" button.
            setTimeout(() => {
              modalButton.$refs.button.focus();
            }, 200);
          }
        });
      },
    },
    $trs: {
      description:
        'If you are setting up Kolibri to be used by other users, you or someone you delegate will be responsible for protecting and managing the user accounts and personal information stored on this device.',
      header: 'Responsibilities as an administrator',
    },
  };

</script>


<style lang="scss" scoped></style>
