<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :settingIsEnabled="settingIsEnabled"
    :submitText="submitText"
    :description="$tr('description')"
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
      const { allow_guest_access, preset } = this.$store.state.onboardingData;
      if (allow_guest_access !== null) {
        return {
          settingIsEnabled: allow_guest_access,
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
      description:
        'This allows anyone to view resources on Kolibri without needing to make an account',
      header: 'Enable guest access?',
      noOptionLabel: 'No. Users must have an account to view resources on Kolibri',
    },
  };

</script>


<style lang="scss" scoped></style>
