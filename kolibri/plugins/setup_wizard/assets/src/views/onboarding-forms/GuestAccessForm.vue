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
      description: {
        message:
          'This allows anyone to view resources on Kolibri without needing to make an account',
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
    },
  };

</script>


<style lang="scss" scoped></style>
