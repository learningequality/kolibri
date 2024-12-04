<template>

  <OnboardingForm
    :header="headerText"
    :submitText="submitText"
    :description="description"
    @submit="emitSetting"
  >
    <KRadioButtonGroup>
      <KRadioButton
        ref="yesRadio"
        v-model="setting"
        :label="yesOptionLabel"
        :buttonValue="true"
      />
      <KRadioButton
        ref="noRadio"
        v-model="setting"
        :label="noOptionLabel"
        :buttonValue="false"
        :description="noOptionDescription"
      />
    </KRadioButtonGroup>
    <template #footer>
      <p>
        {{ $tr('details') }}
      </p>
    </template>
  </OnboardingForm>

</template>


<script>

  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'YesNoForm',
    components: {
      OnboardingForm,
    },
    props: {
      yesOptionLabel: {
        type: String,
        default() {
          return this.$tr('yesOptionLabel');
        },
      },
      noOptionLabel: {
        type: String,
        required: true,
      },
      noOptionDescription: {
        type: String,
        default: null,
      },
      headerText: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        default: null,
      },
      submitText: {
        type: String,
        default: null,
      },
      settingIsEnabled: {
        type: Boolean,
      },
    },
    data() {
      if (this.settingIsEnabled === undefined) {
        return {
          setting: true,
        };
      }
      return {
        setting: this.settingIsEnabled,
      };
    },
    mounted() {
      if (this.setting) {
        this.$refs['yesRadio'].focus();
      } else {
        this.$refs['noRadio'].focus();
      }
    },
    methods: {
      emitSetting() {
        return this.$emit('submit', this.setting);
      },
    },
    $trs: {
      details: {
        message: 'You can change this in your facility settings later',
        context:
          "Note to indicate that admins can change the settings later after they've done the initial set up.",
      },
      yesOptionLabel: {
        message: 'Yes',
        context: 'Option label.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .info-icon {
    vertical-align: middle;
  }

</style>
