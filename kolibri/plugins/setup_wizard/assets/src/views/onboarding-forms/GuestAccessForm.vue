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
      const { settings, preset } = this.$store.state.onboardingData;
      if (settings.allow_guest_access !== null) {
        return {
          settingIsEnabled: settings.allow_guest_access,
        };
      }
      // Default is False only for "formal" preset
      return {
        settingIsEnabled: preset !== 'formal',
      };
    },
    methods: {
      setSetting(setting) {
        this.$store.commit('SET_ALLOW_GUEST_ACCESS', setting);
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
