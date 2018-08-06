<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :settingIsEnabled="settingIsEnabled"
    :submitText="submitText"
    :headerText="$tr('header')"
    @submit="setSetting"
  />

</template>


<script>

  import YesNoForm from './YesNoForm';

  export default {
    name: 'GuestAccessForm',
    components: {
      YesNoForm,
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      let settingIsEnabled = true;
      if (this.$store.state.onboardingData.preset === 'formal') {
        settingIsEnabled = false;
      }
      return {
        settingIsEnabled,
      };
    },
    methods: {
      setSetting() {
        this.$store.commit('SET_ALLOW_GUEST_ACCESS', this.settingIsEnabled);
        this.$emit('submit');
      },
    },
    $trs: {
      header: 'Allow anyone to use Kolibri as a guest?',
      noOptionLabel: 'No. Users must sign into view content',
    },
  };

</script>


<style lang="scss" scoped></style>
