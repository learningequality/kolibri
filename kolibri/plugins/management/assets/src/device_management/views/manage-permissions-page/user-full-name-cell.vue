<template>

  <span>
    <mat-svg
      category="toggle"
      name="star"
      :style="{ fill: '#FBBF2E' }"
    />
    <mat-svg
      category="toggle"
      name="star"
      :style="{ fill: '#996189' }"
    />
    <mat-svg
      category="social"
      name="person"
      :style="{ fill: '#686868' }"
    />

    {{ user.full_name }}
  </span>

</template>


<script>

  export default {
    components: {

    },
    props: ['user'],
    computed: {


    },
    methods: {

    },
    vuex: {
      getters: {
        userPermissions: state => userid => state.pageState.permissions[userid],
      },
      actions: {

      },
    },
  }

</script>


<style lang="stylus" scoped>

</style>
