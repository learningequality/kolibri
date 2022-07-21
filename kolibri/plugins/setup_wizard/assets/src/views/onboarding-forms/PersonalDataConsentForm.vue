<template>

  <OnboardingStepBase
    :title="$tr('header')"
    :description="$tr('description')"
    @continue="handleContinue"
  >
    <KButton
      ref="modalButton"
      data-test="modal-open-button"
      :text="coreString('usageAndPrivacyLabel')"
      appearance="basic-link"
      @click="showModal = true"
    />

    <PrivacyInfoModal
      v-if="showModal"
      hideUsersSection
      @cancel="closeModal"
      @submit="closeModal"
    />
  </OnboardingStepBase>

</template>


<script>

  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'PersonalDataConsentForm',
    components: {
      PrivacyInfoModal,
      OnboardingStepBase,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        showModal: false,
      };
    },
    mounted() {
      this.focusOnModalButton();
    },
    inject: ['wizardService'],
    methods: {
      handleContinue() {
        this.wizardService.send({ type: 'CONTINUE', value: this.setting });
      },
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
      description: {
        message:
          'If you are setting up Kolibri to be used by other users, you or someone you delegate will be responsible for protecting and managing the user accounts and personal information stored on this device.',
        context: "Description of the 'Responsibilities as an administrator' page.",
      },
      header: {
        message: 'Responsibilities as an administrator',
        context:
          'When an admin sets up a Kolibri facility they need to take into consideration the relevant privacy laws and regulations. This is the title of that section in the set up process where they can view those regulations.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    font-size: 1.5em;
  }

  .description {
    padding-bottom: 8px;
    font-size: 0.875em;
  }

</style>
