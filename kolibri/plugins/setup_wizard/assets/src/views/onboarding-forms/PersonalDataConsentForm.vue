<template>

  <OnboardingStepBase
    :title="$tr('header')"
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="step"
    :noBackAction="true"
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

  import PrivacyInfoModal from 'kolibri/components/PrivacyInfoModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { FooterMessageTypes } from '../../constants';

  export default {
    name: 'PersonalDataConsentForm',
    components: {
      PrivacyInfoModal,
      OnboardingStepBase,
    },
    mixins: [commonCoreStrings],
    props: {
      footerMessageType: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showModal: false,
      };
    },
    computed: {
      // It's the last step in any case, so we can just use this for both step and steps props
      step() {
        if (this.footerMessageType === FooterMessageTypes.NEW_FACILITY) {
          return 5;
        }
        if (this.footerMessageType === FooterMessageTypes.IMPORT_FACILITY) {
          return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 4 : 5;
        }
        return null;
      },
    },
    mounted() {
      this.focusOnModalButton();
    },
    inject: ['wizardService'],
    methods: {
      handleContinue() {
        // Assumes all states that this transitions from have a `meta` object (as they do and
        // should) the `meta` object maps states in the wizardMachine to their metadata.
        // In our case, we either want to go straight to the finish OR to a user credentials
        // form. The state machine can define the expected event name for it's particular context.
        // See the comments around this in wizardMachine
        const lastStatePath = Object.keys(this.wizardService._state.meta)[0];
        const { nextEvent = null } = this.wizardService.state.meta[lastStatePath];

        if (!nextEvent) {
          const err =
            'Please provide the event you expect where you are using this Component in' +
            " the state machine in the meta field's `nextEvent` property.";
          return this.$store.dispatch('handleApiError', { error: err });
        }
        // TODO Add an Error State with a "Start over" button? Something better than
        // "this silently fails" if something goes wrong for the user
        this.wizardService.send(nextEvent);
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
          'If you are setting up Kolibri for other users, you or someone you delegate will need to be responsible for protecting and managing their accounts and personal information.',
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
