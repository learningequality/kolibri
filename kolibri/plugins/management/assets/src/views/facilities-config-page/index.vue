<template>
  <div>
    <div>
      <h2>Facilities Configuration</h2>
      <p>Configure and change different Facility settings here.</p>
    </div>

    <div>
      <h3>Your current Facility</h3>
      <p class="current-facility-name">
        {{ currentFacilityName }}
      </p>
    </div>

    <div>
      <h2>Facility Settings</h2>
    </div>
  </div>
</template>

<script>
  module.exports = {
    components: {

    },
    computed: {

    },
    methods: {

    },
    vuex: {
      getters: {
        currentFacilityName: () => 'Nalanda Maths',
      },
      actions: {

      },
    },
  };
</script>

<style lang="stylus" scoped>

</style>
