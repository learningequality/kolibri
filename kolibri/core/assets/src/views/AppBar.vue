<template>

  <div :style="{ backgroundColor: $themeTokens.primary }">
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
        v-if="$theme.appBar.topLogo"
        slot="brand"
        :src="$theme.appBar.topLogo.src"
        :alt="$theme.appBar.topLogo.alt"
        :style="$theme.appBar.topLogo.style"
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
          :ariaLabel="$tr('userMenu')"
          @click="userMenuDropdownIsOpen = !userMenuDropdownIsOpen"
        >
          <mat-svg
            slot="icon"
            name="person"
            category="social"
            :style="{fill: $themeTokens.textInverted}"
          />
          <span v-if="isUserLoggedIn" class="username">{{ username }}</span>
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
              {{ $tr('userTypeLabel') }}
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
              @select="handleChangeLanguage"
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

      </div>
    </UiToolbar>
    <div class="subpage-nav">
      <slot name="sub-nav"></slot>
    </div>
  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import UiButton from 'keen-ui/src/UiButton';
  import navComponents from 'kolibri.utils.navComponents';
  import { NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import navComponentsMixin from '../mixins/nav-components';
  import LogoutSideNavEntry from './LogoutSideNavEntry';

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
    },
    mixins: [navComponentsMixin, themeMixin],
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
      }),
      menuOptions() {
        return navComponents
          .filter(component => component.section === NavComponentSections.ACCOUNT)
          .filter(this.filterByRole);
      },
    },
    created() {
      window.addEventListener('click', this.handleWindowClick);
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
      openNav: 'Open site navigation menu',
      userTypeLabel: 'User type',
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
    overflow-x: hidden;
    text-overflow: ellipsis;
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

</style>
