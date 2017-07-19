<template>

  <div class="role-switcher">
    <template v-if="currentRole === ADMIN">
      {{ $tr('admin') }}
    </template>

    <template v-else>
      <button
        :class="buttonClass(LEARNER)"
        :disabled="isCurrentRole(LEARNER)"
        :name="LEARNER"
        @click="handleClick(LEARNER)"
        class="role-button btn-left-edge"
      >
        {{ $tr('learner') }}
      </button>
      <button
        :class="buttonClass(COACH)"
        :disabled="isCurrentRole(COACH)"
        :name="COACH"
        @click="handleClick(COACH)"
        class="role-button btn-right-edge"
      >
        {{ $tr('coach') }}
      </button>
    </template>
  </div>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';

  const { ADMIN, COACH, LEARNER } = UserKinds;

  export default {
    props: {
      currentRole: {
        type: String,
        required: true,
      },
    },
    computed: {
      ADMIN: () => ADMIN,
      COACH: () => COACH,
      LEARNER: () => LEARNER,
    },
    methods: {
      buttonClass(roleName) {
        return this.isCurrentRole(roleName) ? 'role-button-selected' : '';
      },
      handleClick(roleName) {
        if (roleName === LEARNER) {
          return this.$emit('click-remove-coach');
        }
        return this.$emit('click-add-coach');
      },
      isCurrentRole(roleName) {
        return roleName === this.currentRole;
      },
    },
    $trNameSpace: 'roleSwitcher',
    $trs: {
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .role-button
    border: solid $core-action-normal 1px
    border-radius: 5px
    padding: 4px 8px
    &[disabled]
      opacity: 1.0

  .role-button-selected
    color: white
    background-color: $core-action-normal

  .btn-left-edge
    border-top-right-radius: 0
    border-bottom-right-radius: 0
    float: left

  .btn-right-edge
    border-top-left-radius: 0
    border-bottom-left-radius: 0

</style>
