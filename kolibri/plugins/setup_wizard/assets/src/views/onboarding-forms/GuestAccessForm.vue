<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :settingIsEnabled="settingIsEnabled"
    :description="$tr('description')"
    :headerText="$tr('header')"
    @submit="handleSubmit"
  />

</template>


<script>

  import YesNoForm from './YesNoForm';

  export default {
    name: 'GuestAccessForm',
    components: {
      YesNoForm,
    },
    data() {
      return {
        settingIsEnabled: this.$store.state.onboardingData.allow_guest_access,
      };
    },
    methods: {
      handleSubmit(setting) {
        this.$store.commit('SET_ALLOW_GUEST_ACCESS', setting);
        this.$emit('click_next');
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
