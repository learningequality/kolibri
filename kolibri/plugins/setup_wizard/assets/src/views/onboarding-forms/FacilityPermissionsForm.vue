<template>

  <div>
    <h1 class="title">
      {{ $tr('learningEnvironmentHeader') }}
    </h1>
    <KRadioButton
      ref="first-button"
      v-model="selected"
      class="permission-preset-radio-button"
      :value="Presets.NONFORMAL"
      :label="$tr('nonFormalLabel')"
      :description="$tr('nonFormalDescription')"
    />
    <FacilityNameTextbox
      v-if="selected === Presets.NONFORMAL"
      ref="facility-name"
      class="textbox"
    />
    <KRadioButton
      v-model="selected"
      class="permission-preset-radio-button"
      :value="Presets.FORMAL"
      :label="$tr('formalLabel')"
      :description="$tr('formalDescription')"
    />
    <FacilityNameTextbox
      v-if="selected === Presets.FORMAL"
      ref="facility-name"
      class="textbox"
    />
  </div>

</template>


<script>

  import { Presets } from '../../constants';
  import FacilityNameTextbox from './FacilityNameTextbox';

  export default {
    name: 'FacilityPermissionsForm',
    components: {
      FacilityNameTextbox,
    },
    data() {
      return {
        selected: this.$store.state.onboardingData.preset || Presets.NONFORMAL,
        Presets,
      };
    },
    mounted() {
      this.focusOnTextbox();
    },
    methods: {
      focusOnTextbox() {
        return this.$refs['facility-name'].focus();
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
        message: 'Schools and other formal learning contexts',
        context: "Option description text for 'Formal' facility types.",
      },
      nonFormalLabel: {
        message: 'Non-formal',
        context: 'Label for the radio button option in the facility setup',
      },
      nonFormalDescription: {
        message:
          'Libraries, orphanages, correctional facilities, youth centers, computer labs, and other non-formal learning contexts',

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
