<template>

  <OnboardingStepBase
    :title="$tr('learningEnvironmentHeader')"
    :footerMessageType="footerMessageType"
    :step="1"
    :steps="5"
    @continue="handleContinue"
  >
    <KRadioButtonGroup>
      <KRadioButton
        ref="first-button"
        v-model="selected"
        class="permission-preset-radio-button"
        :buttonValue="Presets.NONFORMAL"
        :label="$tr('nonFormalLabel')"
        :description="$tr('nonFormalDescription')"
      />
      <FacilityNameTextbox
        v-if="selected === Presets.NONFORMAL"
        ref="facility-name"
        v-model="facilityName"
        class="textbox"
      />
      <KRadioButton
        v-model="selected"
        class="permission-preset-radio-button"
        :buttonValue="Presets.FORMAL"
        :label="$tr('formalLabel')"
        :description="$tr('formalDescription')"
      />
      <FacilityNameTextbox
        v-if="selected === Presets.FORMAL"
        ref="facility-name"
        v-model="facilityName"
        class="textbox"
      />
    </KRadioButtonGroup>
  </OnboardingStepBase>

</template>


<script>

  import { Presets } from 'kolibri/constants';
  import { FooterMessageTypes } from '../../constants';
  import OnboardingStepBase from '../OnboardingStepBase';
  import FacilityNameTextbox from './FacilityNameTextbox';

  export default {
    name: 'FacilityPermissionsForm',
    components: {
      FacilityNameTextbox,
      OnboardingStepBase,
    },
    data() {
      const preset = this.wizardService.state.context['formalOrNonformal'];
      // preset inits to null, so either it'll be what the user selected or default to nonformal
      const selected = preset || Presets.NONFORMAL;

      const facilityName = this.wizardService.state.context['facilityName'];
      const footerMessageType = FooterMessageTypes.NEW_FACILITY;
      return {
        footerMessageType,
        facilityName,
        selected,
        Presets,
      };
    },
    computed: {
      facilityNameInvalid() {
        return !this.facilityName || this.facilityName.trim() === '';
      },
    },
    mounted() {
      this.focusOnTextbox();
    },
    inject: ['wizardService'],
    methods: {
      handleContinue() {
        if (this.facilityNameInvalid) {
          return this.focusOnTextbox();
        } else {
          this.wizardService.send({
            type: 'CONTINUE',
            value: { selected: this.selected, facilityName: this.facilityName },
          });
        }
      },
      focusOnTextbox() {
        if (this.$refs && this.$refs['facility-name']) {
          return this.$refs['facility-name'].focus();
        }
      },
    },
    $trs: {
      learningEnvironmentHeader: {
        message: 'What kind of learning environment is your facility?',
        context: 'Page title for facility setup process.',
      },
      formalLabel: {
        message: 'Formal',
        context: 'Label for the radio button option in the facility setup.',
      },
      formalDescription: {
        message: 'Schools and other formal learning contexts.',
        context: "Option description text for 'Formal' facility types.",
      },
      nonFormalLabel: {
        message: 'Non-formal',
        context: 'Label for the radio button option in the facility setup',
      },
      nonFormalDescription: {
        message:
          'Libraries, orphanages, youth centers, computer labs, and other non-formal learning contexts.',

        context: "Option description text for 'Non-formal' facility types.",
      },
    },
    //
  };

</script>


<style lang="scss" scoped>

  $margin-of-radio-button-text: 32px;

  .title {
    font-size: 1.5em;
  }

  .permission-preset {
    cursor: pointer;
  }

  .permission-preset-modal-dismiss-button {
    text-transform: uppercase;
  }

  .permission-preset-human {
    margin-bottom: 8px;
  }

  .permission-preset-human-title {
    font-weight: bold;
  }

  .permission-preset-human-detail {
    display: list-item;
    margin-left: 20px;
    line-height: 1.4em;
  }

  .textbox {
    margin-top: 16px;
    margin-bottom: 0;
    margin-left: 32px;
  }

</style>
