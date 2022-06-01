<template>

  <div class="form">
    <h1 class="title">
      {{ $tr('header') }}
    </h1>
    <KRadioButton
      ref="yesRadio"
      v-model="setting"
      class="radio-button"
      :label="$tr('yesOptionLabel')"
      :value="true"
    />
    <KRadioButton
      ref="noRadio"
      v-model="setting"
      class="radio-button"
      :label="$tr('noOptionLabel')"
      :value="false"
    />
    <p class="description">
      {{ $tr('changeLater') }}
    </p>
  </div>

</template>


<script>

  export default {
    name: 'RequirePasswordForLearnersForm',
    data() {
      return {
        setting: '',
      };
    },
    $trs: {
      header: {
        message: 'Enable passwords on learner accounts?',
        context:
          'Admins can either enable passwords for learners or offer a simplified sign-in, without the password requirement. This allows easier access for younger learners.',
      },
      yesOptionLabel: {
        message: 'Yes',
        context:
          "Option on the 'Enable passwords for learners' screen. The admin selects this option if they don't want to enable passwords for learner accounts.",
      },
      noOptionLabel: {
        message: 'No. Learner accounts can sign in with just a username',
        context:
          "Option on the 'Enable passwords for learners' screen. The admin selects this option if they don't want to enable passwords for learner accounts.",
      },
      changeLater: {
        message: 'You can change this in your learning facility settings later',
        context: '',
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

  .radio-button {
    padding-bottom: 8px;
    font-size: 0.875em;
  }

</style>
