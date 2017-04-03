<template>

  <div class="role-switcher">
    <template v-if="currentRole === 'admin'">
      {{ $tr('admin') }}
    </template>

    <template v-else>
      <ui-button
        name="learner"
        :ariaLabel="$tr('learner')"
        :color="isCurrentRole('learner') ? 'primary' : 'secondary'"
        :disableRipple="true"
        :disabled="isCurrentRole('learner')"
        @click="handleClick('learner')"
        class="ttn role-button btn-left-edge"
      >
        {{ $tr('learner') }}
      </ui-button>
      <ui-button
        name="coach"
        :ariaLabel="$tr('coach')"
        :color="isCurrentRole('coach') ? 'primary' : 'secondary'"
        :disableRipple="true"
        :disabled="isCurrentRole('coach')"
        @click="handleClick('coach')"
        class="ttn role-button btn-right-edge"
      >
        {{ $tr('coach') }}
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
      },
      isCurrentRole(roleName) {
        return roleName === this.currentRole;
      }
    },
    $trNameSpace: 'classEnrollPage',
    $trs: {
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
    },
  };

</script>


<style lang="stylus" scoped>

  .role-button
    border: solid #996189 1px
    border-radius: 5px
    font-size: 1rem
    height: 100%
    width: 50%
    &[disabled]
      opacity: 1.0

  .ttn
    text-transform: none

  .learner-role-selector

  .btn-left-edge
    border-top-right-radius: 0
    border-bottom-right-radius: 0
    float: left

  .btn-right-edge
    border-top-left-radius: 0
    border-bottom-left-radius: 0

</style>
