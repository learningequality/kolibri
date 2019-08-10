<template>

  <OnboardingForm
    :header="headerText"
    :submitText="submitText"
    :description="description"
    @submit="emitSetting"
  >
    <KRadioButton
      ref="yesRadio"
      v-model="setting"
      :label="yesOptionLabel"
      :value="true"
    />
    <KRadioButton
      ref="noRadio"
      v-model="setting"
      :label="noOptionLabel"
      :value="false"
    >
      <CoreInfoIcon
        v-if="noOptionTooltip"
        class="info-icon"
        :iconAriaLabel="noOptionLabel"
        :tooltipText="noOptionTooltip"
      />
    </KRadioButton>

    <p slot="footer">
      {{ $tr('details') }}
    </p>
  </OnboardingForm>

</template>


<script>

  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'YesNoForm',
    components: {
      CoreInfoIcon,
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
      noOptionTooltip: {
        type: String,
      },
      headerText: {
        type: String,
        required: true,
      },
      description: {
        type: String,
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

  .info-icon {
    vertical-align: middle;
  }

</style>
