<template>

  <div>
    <template>
      <ui-button
        @click="handleClick('learner')"
        :color="currentRole === 'learner' ? 'primary' : 'secondary'"
        :disableRipple="true"
        class="ttn"
      >
        {{ $tr('learner') }}
      </ui-button>
      <ui-button
        @click="handleClick('coach')"
        :color="currentRole === 'coach' ? 'primary' : 'secondary'"
        class="ttn"
        :disableRipple="true"
      >
        Coach
      </ui-button>
    </template>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'ui-button': require('keen-ui/src/UiButton'),
    },
    props: {
      currentRole: {
        type: String, /* coach, learner, admin */
        required: true,
      },
    },
    methods: {
      handleClick(roleName) {
        if (roleName === 'learner') {
          return this.$emit('click-remove-coach');
        }
        return this.$emit('click-add-coach');
      }
    },
    $trNameSpace: 'classEnrollPage',
    $trs: {
      learner: 'Learner',
    },
  };

</script>


<style lang="stylus" scoped>

  .ttn
    text-transform: none

  .foo
    text-align: center

</style>
