<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    :style="{ height: height + 'px' }"
  >
    <ui-icon-button
      slot="icon"
      type="secondary"
      @click="$emit('toggleSideNav')"
    >
      <mat-svg
        class="icon"
        name="menu"
        category="navigation"
      />
    </ui-icon-button>

    <div>
      <div class="app-bar-title-icon"></div>
      {{ title }}
    </div>

    <div slot="actions">
      <slot name="app-bar-actions"></slot>

      <ui-button
        ref="userMenuButton"
        type="primary"
        color="primary"
        class="user-menu-button"
        :ariaLabel="$tr('userMenu')"
        @click="userMenuDropdownIsOpen = !userMenuDropdownIsOpen"
      >
        <mat-svg
          slot="icon"
          name="person"
          category="social"
        />
        <template v-if="isUserLoggedIn">{{ username }}</template>
        <mat-svg name="arrow_drop_down" category="navigation" />
      </ui-button>

      <core-menu
        v-show="userMenuDropdownIsOpen"
        ref="userMenuDropdown"
        class="user-menu-dropdown"
        :raised="true"
        :containFocus="true"
        :hasIcons="true"
        @close="userMenuDropdownIsOpen = false"
      >
        <template slot="header" v-if="isUserLoggedIn">
          <div class="role">{{ $tr('role') }}</div>
          <div v-if="isAdmin">{{ $tr('admin') }}</div>
          <div v-else-if="isCoach">{{ $tr('coach') }}</div>
          <div v-else-if="isLearner">{{ $tr('learner') }}</div>
        </template>

        <template slot="options">
          <component v-for="component in menuOptions" :is="component" :key="component.name" />
          <core-menu-option
            :label="$tr('languageSwitchMenuOption')"
            @select="showLanguageModal = true"
          >
            <mat-svg
              slot="icon"
              name="language"
              category="action"
            />
          </core-menu-option>
          <logout v-if="isUserLoggedIn" />
        </template>

      </core-menu>

      <language-switcher-modal
        v-if="showLanguageModal"
        @close="showLanguageModal = false"
        class="override-ui-toolbar"
      />
    </div>
  </ui-toolbar>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import uiToolbar from 'keen-ui/src/UiToolbar';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import coreMenu from 'kolibri.coreVue.components.coreMenu';
  import coreMenuOption from 'kolibri.coreVue.components.coreMenuOption';
  import uiButton from 'keen-ui/src/UiButton';
  import navComponents from 'kolibri.utils.navComponents';
  import { sections } from 'kolibri.utils.navComponents';
  import navComponentsMixin from '../mixins/nav-components';
  import languageSwitcherModal from './language-switcher/modal';
  import logout from './logout-side-nav-entry';

  export default {
    name: 'appBar',
    components: {
      uiToolbar,
      uiIconButton,
      coreMenu,
      uiButton,
      languageSwitcherModal,
      coreMenuOption,
      logout,
    },
    mixins: [responsiveWindow, navComponentsMixin],
    $trs: {
      role: 'Role',
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
      languageSwitchMenuOption: 'Change language',
      userMenu: 'User menu',
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
    data: () => ({
      showLanguageModal: false,
      userMenuDropdownIsOpen: false,
    }),
    computed: {
      menuOptions() {
        return navComponents
          .filter(action => action.section === sections.ACCOUNT)
          .filter(this.filterByRole);
      },
    },
    created() {
      window.addEventListener('click', this.handleClick);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleClick);
    },
    methods: {
      handleClick(event) {
        if (
          !this.$refs.userMenuDropdown.$el.contains(event.target) &&
          !this.$refs.userMenuButton.$el.contains(event.target) &&
          this.userMenuDropdownIsOpen
        ) {
          this.userMenuDropdownIsOpen = false;
        }
        return event;
      },
    },
    vuex: {
      getters: {
        username: state => state.core.session.username,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  >>>.override-ui-toolbar
    color: $core-text-default

  .app-bar
    overflow: hidden

  .user-menu-button
    text-transform: none
    vertical-align: middle
    svg
      fill: white

  .user-menu-dropdown
    position: fixed
    right: 0
    z-index: 8

  .role
    font-size: small
    font-weight: bold
    margin-bottom: 8px

  // Will display icon in app bar if variables are defined
  .app-bar-title-icon
    background: $app-bar-title-icon
    height: $app-bar-title-icon-height
    width: $app-bar-title-icon-height
    display: inline-block
    vertical-align: middle
    background-size: cover

  .icon
    fill: white

</style>
