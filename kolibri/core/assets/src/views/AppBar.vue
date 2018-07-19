<template>

  <UiToolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    :style="{ height: height + 'px' }"
  >
    <UiIconButton
      slot="icon"
      type="secondary"
      @click="$emit('toggleSideNav')"
    >
      <mat-svg
        class="icon"
        name="menu"
        category="navigation"
      />
    </UiIconButton>

    <div>
      <div class="app-bar-title-icon"></div>
      {{ title }}
    </div>

    <div slot="actions">
      <slot name="app-bar-actions"></slot>

      <UiButton
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
      </UiButton>

      <CoreMenu
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
          <CoreMenuOption
            :label="$tr('languageSwitchMenuOption')"
            @select="showLanguageModal = true"
          >
            <mat-svg
              slot="icon"
              name="language"
              category="action"
            />
          </CoreMenuOption>
          <LogoutSideNavEntry v-if="isUserLoggedIn" />
        </template>

      </CoreMenu>

      <LanguageSwitcherModal
        v-if="showLanguageModal"
        @close="showLanguageModal = false"
        class="override-ui-toolbar"
      />
    </div>
  </UiToolbar>

</template>


<script>

  import { mapGetters, mapState, mapActions } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import UiToolbar from 'keen-ui/src/UiToolbar';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import UiButton from 'keen-ui/src/UiButton';
  import navComponents from 'kolibri.utils.navComponents';
  import { NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import navComponentsMixin from '../mixins/nav-components';
  import LanguageSwitcherModal from './language-switcher/LanguageSwitcherModal';
  import LogoutSideNavEntry from './LogoutSideNavEntry';

  export default {
    name: 'AppBar',
    components: {
      UiToolbar,
      UiIconButton,
      CoreMenu,
      UiButton,
      LanguageSwitcherModal,
      CoreMenuOption,
      LogoutSideNavEntry,
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
      ...mapGetters(['isUserLoggedIn', 'isAdmin', 'isCoach', 'isLearner']),
      ...mapState({
        username: state => state.core.session.username,
      }),
      menuOptions() {
        return navComponents
          .filter(component => component.section === NavComponentSections.ACCOUNT)
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
      ...mapActions(['kolibriLogout']),
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  /deep/ .override-ui-toolbar {
    color: $core-text-default;
  }

  .app-bar {
    overflow: hidden;
  }

  .user-menu-button {
    text-transform: none;
    vertical-align: middle;
    svg {
      fill: white;
    }
  }

  .user-menu-dropdown {
    position: fixed;
    right: 0;
    z-index: 8;
  }

  .role {
    margin-bottom: 8px;
    font-size: small;
    font-weight: bold;
  }

  .icon {
    fill: white;
  }

</style>
