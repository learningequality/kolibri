<template>

  <div v-show="!$isPrint" :style="{ backgroundColor: $themeTokens.appBar }">

    <SkipNavigationLink />

    <UiToolbar
      :title="title"
      type="clear"
      textColor="white"
      class="app-bar"
      :style="{ height: height + 'px' }"
      :raised="false"
      :removeBrandDivider="true"
    >
      <UiIconButton
        slot="icon"
        type="secondary"
        :aria-label="$tr('openNav')"
        @click="$emit('toggleSideNav')"
      >
        <mat-svg
          name="menu"
          category="navigation"
          :style="{fill: $themeTokens.textInverted}"
        />
      </UiIconButton>

      <img
        v-if="$kolibriBranding.appBar.topLogo"
        slot="brand"
        :src="$kolibriBranding.appBar.topLogo.src"
        :alt="$kolibriBranding.appBar.topLogo.alt"
        :style="$kolibriBranding.appBar.topLogo.style"
        class="brand-logo"
      >

      <div slot="actions">
        <slot name="app-bar-actions"></slot>
        <div class="total-points">
          <slot name="totalPointsMenuItem"></slot>
        </div>

        <UiButton
          ref="userMenuButton"
          type="primary"
          color="clear"
          class="user-menu-button"
          :class="$computedClass({':focus': $coreOutline})"
          :ariaLabel="$tr('userMenu')"
          @click="userMenuDropdownIsOpen = !userMenuDropdownIsOpen"
        >
          <mat-svg
            slot="icon"
            name="person"
            category="social"
            :style="{fill: $themeTokens.textInverted}"
          />
          <span v-if="isUserLoggedIn" class="username" tabindex="-1">{{ dropdownName }}</span>
          <mat-svg
            name="arrow_drop_down"
            category="navigation"
            :style="{fill: $themeTokens.textInverted}"
          />
        </UiButton>

        <CoreMenu
          v-show="userMenuDropdownIsOpen"
          ref="userMenuDropdown"
          class="user-menu-dropdown"
          :raised="true"
          :containFocus="true"
          :showActive="false"
          :style="{backgroundColor: $themeTokens.surface}"
          @close="userMenuDropdownIsOpen = false"
        >
          <template v-if="isUserLoggedIn" slot="header">
            <div class="role">
              {{ coreString('userTypeLabel') }}
            </div>
            <div>
              <UserTypeDisplay
                :distinguishCoachTypes="false"
                :userType="getUserKind"
              />
            </div>
          </template>

          <template slot="options">
            <component :is="component" v-for="component in menuOptions" :key="component.name" />
            <CoreMenuOption
              :label="$tr('languageSwitchMenuOption')"
              icon="language"
              style="cursor: pointer;"
              @select="handleChangeLanguage"
            />
            <LogoutSideNavEntry v-if="isUserLoggedIn" />
          </template>

        </CoreMenu>

      </div>
    </UiToolbar>
    <div class="subpage-nav">
      <slot name="sub-nav"></slot>
    </div>
  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import UiButton from 'keen-ui/src/UiButton';
  import navComponents from 'kolibri.utils.navComponents';
  import { NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import branding from 'kolibri.utils.branding';
  import navComponentsMixin from '../mixins/nav-components';
  import LogoutSideNavEntry from './LogoutSideNavEntry';
  import SkipNavigationLink from './SkipNavigationLink';

  const hashedValuePattern = /^[a-f0-9]{30}$/;

  export default {
    name: 'AppBar',
    components: {
      UiToolbar,
      UiIconButton,
      CoreMenu,
      UiButton,
      CoreMenuOption,
      LogoutSideNavEntry,
      UserTypeDisplay,
      SkipNavigationLink,
    },
    mixins: [commonCoreStrings, navComponentsMixin],
    props: {
      title: {
        type: String,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        userMenuDropdownIsOpen: false,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'getUserKind']),
      ...mapState({
        username: state => state.core.session.username,
        fullName: state => state.core.session.full_name,
      }),
      menuOptions() {
        return navComponents
          .filter(component => component.section === NavComponentSections.ACCOUNT)
          .filter(this.filterByRole);
      },
      // temp hack for the VF plugin
      dropdownName() {
        return !hashedValuePattern.test(this.username) ? this.username : this.fullName;
      },
    },
    created() {
      window.addEventListener('click', this.handleWindowClick);
      this.$kolibriBranding = branding;
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleWindowClick);
    },
    methods: {
      handleWindowClick(event) {
        if (
          !this.$refs.userMenuDropdown.$el.contains(event.target) &&
          !this.$refs.userMenuButton.$el.contains(event.target) &&
          this.userMenuDropdownIsOpen
        ) {
          this.userMenuDropdownIsOpen = false;
        }
        return event;
      },
      handleChangeLanguage() {
        this.$emit('showLanguageModal');
        this.userMenuDropdownIsOpen = false;
      },
    },
    $trs: {
      openNav: 'Open site navigation',
      languageSwitchMenuOption: 'Change language',
      userMenu: 'User menu',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .user-menu-button {
    text-transform: none;
    vertical-align: middle;
  }

  .username {
    max-width: 200px;
    // overflow-x hidden seems to affect overflow-y also, so include a fixed height
    height: 16px;
    // overflow: hidden on both x and y so that the -y doesn't show scroll buttons
    // at certain zooms/screen sizes
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // Holdover from keen-ui to keep dropdown profile correctly formatted.
  /deep/ .ui-menu {
    min-width: 10.5rem;
    max-width: 17rem;
    max-height: 100vh;
    padding: 0.25rem 0;
    margin: 0;
    overflow-x: hidden;
    overflow-y: auto;
    list-style: none;
    background-color: inherit;
    border: 0.0625rem solid rgba(0, 0, 0, 0.08);
    outline: none;
  }

  .user-menu-dropdown {
    position: fixed;
    right: 0;
    z-index: 8;

    // Holdover from previous CoreMenuOption format. Will keep the profile
    // dropdown formatted correctly.
    /deep/ .core-menu-option-content {
      padding-right: 8px;
      padding-left: 8px;
      font-size: 0.9375rem;
      color: black !important;
    }

    /deep/ svg {
      fill: black !important;
    }
  }

  .role {
    margin-bottom: 8px;
    font-size: small;
    font-weight: bold;
  }

  .total-points {
    display: inline-block;
    margin-left: 16px;
  }

  /deep/ .ui-toolbar__brand {
    min-width: inherit;
  }

  .brand-logo {
    max-width: 48px;
    max-height: 48px;
    margin-right: 8px;
    vertical-align: middle;
  }

  // Hide the UiButton focus ring
  /deep/ .ui-button__focus-ring {
    display: none;
  }

</style>
