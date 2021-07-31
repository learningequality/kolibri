<template>

  <div>
    <OnboardingForm
      :header="$tr('header')"
      :description="$tr('description')"
      :submitText="coreString('finishAction')"
      @submit="handleSubmit"
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
      handleSubmit() {
        this.$emit('click_next');
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


<style lang="scss" scoped></style>
