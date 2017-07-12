<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    @nav-icon-click="$emit('toggleSideNav')"
    :style="{ height: height + 'px' }">
    <div slot="actions">
      <slot name="app-bar-actions"/>
      <ui-button
        v-if="isUserLoggedIn"
        icon="person"
        type="primary"
        color="primary"
        :ariaLabel="$tr('account')"
        :has-dropdown="true"
        ref="accountButton"
        class="username-text">
        <template v-if="windowSize.breakpoint > 2">
          {{ username }}
          <template v-if="isSuperuser">{{ $tr('superuser') }}</template>
          <template v-if="isAdmin">{{ $tr('admin') }}</template>
          <template v-if="isCoach">{{ $tr('coach') }}</template>
        </template>
        <ui-menu
          slot="dropdown"
          :options="accountMenuOptions"
          @close="$refs.accountButton.closeDropdown()"
          @select="optionSelected"
        />
      </ui-button>
      <a v-else href="/user">
        <ui-button
          type="primary"
          color="primary"
          :ariaLabel="$tr('signIn')">
          {{ $tr('signIn') }}
        </ui-button>
      </a>
    </div>
  </ui-toolbar>

</template>


<script>

  import { kolibriLogout } from 'kolibri.coreVue.vuex.actions';
  import {
    isUserLoggedIn,
    isSuperuser,
    isAdmin,
    isCoach,
    isLearner,
  } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import uiToolbar from 'keen-ui/src/UiToolbar';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import uiMenu from 'keen-ui/src/UiMenu';
  import uiButton from 'keen-ui/src/UiButton';
  export default {
    mixins: [responsiveWindow],
    $trNameSpace: 'appBar',
    $trs: {
      account: 'Account',
      profile: 'Profile',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      superuser: '(Device owner)',
      admin: '(Admin)',
      coach: '(Coach)',
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      navShown: {
        type: Boolean,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
    },
    components: {
      uiToolbar,
      uiIconButton,
      uiMenu,
      uiButton,
    },
    computed: {
      accountMenuOptions() {
        return [
          {
            id: 'profile',
            label: this.$tr('profile'),
          },
          {
            id: 'signOut',
            label: this.$tr('signOut'),
          },
        ];
      },
    },
    methods: {
      optionSelected(option) {
        switch (option.id) {
          case 'profile':
            window.location = `/user`;
            break;
          case 'signOut':
            this.kolibriLogout();
            break;
          default:
            break;
        }
      },
    },
    vuex: {
      actions: { kolibriLogout },
      getters: {
        username: state => state.core.session.username,
        isUserLoggedIn,
        isSuperuser,
        isAdmin,
        isCoach,
        isLearner,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .app-bar
    overflow: hidden

  .username-text
    text-transform: none

</style>
