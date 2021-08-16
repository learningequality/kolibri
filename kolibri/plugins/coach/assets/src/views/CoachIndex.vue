<template>

  <router-view />

</template>


<script>

  import urls from 'kolibri.urls';
  import plugin_data from 'plugin_data';

  export default {
    name: 'CoachIndex',
    data() {
      return {
        isSubsetOfUsersDevice: plugin_data['isSubsetOfUsersDevice'],
      };
    },
    mounted() {
      // Redirect to Learn if on SoUD
      if (this.isSubsetOfUsersDevice) {
        // Using method for ease of test coverage
        this.redirectToLearn();
      }
    },
    methods: {
      redirectToLearn() {
        window.location.href = urls['kolibri:kolibri.plugins.learn:learn']();
      },
    },
  };

</script>


<style lang="scss"></style>
