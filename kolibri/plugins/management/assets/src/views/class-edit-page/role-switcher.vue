<template>

  <div class="role-switcher">
    <template v-if="currentRole === ADMIN">
      {{ $tr('admin') }}
    </template>

    <template v-else>
      <ui-button
        :ariaLabel="$tr('learner')"
        :color="buttonColor(LEARNER)"
        :disableRipple="true"
        :disabled="isCurrentRole(LEARNER)"
        :name="LEARNER"
        @click="handleClick(LEARNER)"
        class="ttn role-button btn-left-edge"
      >
        {{ $tr('learner') }}
      </ui-button>
      <ui-button
        :ariaLabel="$tr('coach')"
        :color="buttonColor(COACH)"
        :disableRipple="true"
        :disabled="isCurrentRole(COACH)"
        :name="COACH"
        @click="handleClick(COACH)"
        class="ttn role-button btn-right-edge"
      >
        {{ $tr('coach') }}
      </ui-button>
    </template>
  </div>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import uiButton from 'keen-ui/src/UiButton';

  const { ADMIN, COACH, LEARNER } = UserKinds;

  export default {
    components: { uiButton },
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
      buttonColor(roleName) {
        return this.isCurrentRole(roleName) ? 'primary' : 'secondary';
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
    name: 'roleSwitcher',
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

  .btn-left-edge
    border-top-right-radius: 0
    border-bottom-right-radius: 0
    float: left

  .btn-right-edge
    border-top-left-radius: 0
    border-bottom-left-radius: 0

</style>
