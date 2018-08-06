<template>

  <OnboardingForm
    :header="headerText"
    :submitText="submitText"
    @submit="emitSetting"
  >
    <KRadioButton
      ref="yesRadio"
      :label="yesOptionLabel"
      v-model="setting"
      :value="true"
    />
    <KRadioButton
      ref="noRadio"
      :label="noOptionLabel"
      v-model="setting"
      :value="false"
    />

    <p class="details">
      {{ $tr('details') }}
    </p>
  </OnboardingForm>

</template>


<script>

  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'YesNoForm',
    components: {
      KRadioButton,
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
      headerText: {
        type: String,
        required: true,
      },
      submitText: {
        type: String,
        required: true,
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
      details: 'You can change this in your facility settings later',
      yesOptionLabel: 'Yes',
    },
  };

</script>


<style lang="scss" scoped>

  .details {
    margin-top: 16px;
  }

</style>
