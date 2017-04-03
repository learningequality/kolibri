<template>

  <div>
    <div class="learner-role-selector">
      <ui-button
        @click="handleClick('learner')"
        :color="currentRole === 'learner' ? 'primary' : 'secondary'"
        :disableRipple="true"
        class="ttn btn-left-edge"
      >
        {{ $tr('learner') }}
      </ui-button>
      <ui-button
        @click="handleClick('coach')"
        :color="currentRole === 'coach' ? 'primary' : 'secondary'"
        class="ttn btn-right-edge"
        :disableRipple="true"
      >
        Coach
      </ui-button>
    </div>
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

  button
    height: auto
    box-sizing: border-box
    padding: 5px 0

  .ttn
    text-transform: none

  .learner-role-selector
    border: solid #996189 1px
    border-radius: 5px
    box-sizing: border-box

  .btn-left-edge
    border-top-right-radius: 0
    border-bottom-right-radius: 0
    margin-right: -4px; // something in higher-level scope is adding spacing between block-level els

  .btn-right-edge
    border-top-left-radius: 0
    border-bottom-left-radius: 0

</style>
