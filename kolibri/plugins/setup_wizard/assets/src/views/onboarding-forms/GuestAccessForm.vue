<template>

  <OnboardingStepBase
    :title="$tr('header')"
    :description="$tr('description')"
    @continue="handleContinue"
  >

    <KRadioButton
      ref="yesRadio"
      v-model="setting"
      :label="$tr('yesOptionLabel')"
      :value="true"
    />
    <KRadioButton
      ref="noRadio"
      v-model="setting"
      :label="$tr('noOptionLabel')"
      :value="false"
    />
    <p class="form">
      {{ $tr('changeLater') }}
    </p>


  </OnboardingStepBase>

</template>


<script>

  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'GuestAccessForm',
    components: {
      OnboardingStepBase,
    },
    data() {
      return {
        setting: false,
      };
    },
    inject: ['wizardService'],
    methods: {
      handleContinue() {
        this.wizardService.send({ type: 'CONTINUE', value: this.setting });
      },
    },
    $trs: {
      yesOptionLabel: {
        message: 'Yes',
        context: 'Option label.',
      },
      description: {
        message:
          'This option allows anyone to view educational materials on Kolibri without needing to make an account',
        context:
          "Description of the 'Enable guest access?' option that an admin can configure in the set up process. It means that anyone can access Kolibri without having to create an account.",
      },
      header: {
        message: 'Enable guest access?',
        context:
          'Option that an admin can configure in the set up process. If selected, guests can access Kolibri without the need to create an account.',
      },
      noOptionLabel: {
        message: 'No. Users must have an account to view resources on Kolibri',
        context: "Possible answer to the 'Enable guest access?' question.",
      },
      changeLater: {
        message: 'You can change this in your learning facility settings later',
        context: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .info-icon {
    vertical-align: middle;
  }

  .form {
    font-size: 0.875em;
  }

</style>
