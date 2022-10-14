<template>

  <FocusTrap
    @shouldFocusFirstEl="$emit('shouldFocusFirstEl')"
    @shouldFocusLastEl="$emit('shouldFocusLastEl')"
  >
    <div class="wrapper">

      <div
        v-for="(nestedObject, key) in navigationOptions"
        :key="key"
        class="container"
      >
        <KButton
          ref="menuItem"
          :icon="nestedObject.icon"
          class="inline"
          :text="coreString(nestedObject.text)"
          appearance="flat-button"
          :appearanceOverrides="menuPluginStyles"
          :iconAfter="visibleSubMenu === key ? 'chevronUp' : 'chevronDown'"
          @click="manageDisplay(key)"
        />
        <div v-if="visibleSubMenu === key">
          <div
            v-for="(nestedKey, item) in nestedObject.subNavigation"
            :key="item.value"
            class="link-container"
          >
            <!-- <router-link
            v-if="nestedKey.condition ? nestedKey.condition : true"
            :to="nestedKey.route"
            class="link"
          >
            {{ coreString(nestedKey.text) }}
          </router-link> -->
            <a
              :href="url()"
              class="core-menu-option"
              role="menuitem"
            >
              {{ url() }}
              {{ coreString(nestedKey.text) }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </FocusTrap>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';
  // import commonLearnStrings from 'kolibri.coreVue.mixins.commonLearnStrings';
  import urls from 'kolibri.urls';
  import { PageNames as LearnPageNames } from './../../../../plugins/learn/assets/src/constants';
  import { PageNames as FacilityPageNames } from './../../../../plugins/facility/assets/src/constants';
  import { PageNames as CoachPageNames } from './../../../../plugins/coach/assets/src/constants';

  export default {
    name: 'AndroidNavigationNestedMenu',
    components: { FocusTrap },
    mixins: [commonCoreStrings],
    data() {
      return {
        visibleSubMenu: null,
      };
    },
    computed: {
      // ...mapState('classSummary', { classId: 'id' }),
      menuPluginStyles() {
        console.log(this.$router);
        return {
          color: this.$themeTokens.text,
          width: '99%',
          height: '48px',
          textAlign: 'left',
          padding: '0px 4px',
          border: 'none',
          textTransform: 'capitalize',
          fontWeight: 'normal',
          ':hover': this.menuPluginActiveStyles,
        };
      },
      menuPluginActiveStyles() {
        return {
          backgroundColor: this.$themeBrand.primary.v_50,
          color: this.$themeBrand.primary,
          fontWeight: 'bold',
          padding: '0px 4px',
          borderRadius: '4px',
        };
      },
      navigationOptions() {
        return {
          learnSubnav: {
            icon: 'home',
            text: 'learnLabel',
            subNavigation: {
              home: {
                text: 'homeLabel',
                route: this.$router.getRoute(LearnPageNames.HOME),
              },
              library: {
                text: 'libraryLabel',
                route: this.$router.getRoute(LearnPageNames.LIBRARY),
              },
              bookmarks: {
                text: 'bookmarksLabel',
                route: this.$router.getRoute(LearnPageNames.BOOKMARKS),
              },
            },
          },
          coachSubnav: {
            icon: 'coach',
            text: 'coachLabel',
            subNavigation: {
              classHome: {
                text: 'classes',
                route: this.coachRoute('ClassesPage'),
              },
              reports: {
                condition: Boolean(this.classId),
                text: 'reportsLabel',
                route: this.coachRoute(CoachPageNames.REPORTS_PAGE),
              },
              plan: {
                condition: Boolean(this.classId),
                text: 'plan',
                route: this.coachRoute(CoachPageNames.PLAN_PAGE),
              },
            },
          },
          facilitySubnav: {
            icon: 'facility',
            text: 'facilityLabel',
            test: this.$router,
            subNavigation: {
              facilityClasses: {
                text: this.coreString('classesLabel'),
                route: this.facilityRoute(FacilityPageNames.CLASS_MGMT_PAGE),
              },
              facilityUsers: {
                text: this.coreString('usersLabel'),
                route: this.facilityRoute(FacilityPageNames.USER_MGMT_PAGE),
              },
              facilitySettings: {
                text: this.coreString('settings'),
                route: this.facilityRoute(FacilityPageNames.FACILITY_CONFIG_PAGE),
              },
              facilityData: {
                text: this.coreString('data'),
                route: this.facilityRoute(FacilityPageNames.DATA_EXPORT_PAGE),
              },
            },
          },
          deviceSubnav: {
            icon: 'device',
            text: 'deviceManagementTitle',
            subNavigation: {
              channels: {
                text: this.coreString('channelsLabel'),
                route: this.deviceRoute('MANAGE_CONTENT_PAGE'),
              },
              permissions: {
                text: this.$tr('permissionsLabel'),
                route: this.deviceRoute('MANAGE_PERMISSIONS_PAGE'),
              },
              facilities: {
                text: this.coreString('facilitiesLabel'),
                route: this.deviceRoute('FACILITIES_PAGE'),
              },
              info: {
                text: this.$tr('infoLabel'),
                route: this.deviceRoute('DEVICE_INFO_PAGE'),
              },
              settings: {
                text: this.$tr('settingsLabel'),
                route: this.deviceRoute('DEVICE_SETTINGS_PAGE'),
              },
            },
          },
        };
      },
    },
    methods: {
      url() {
        return urls['kolibri:kolibri.plugins.device:device_management']();
      },
      manageDisplay(key) {
        if (this.visibleSubMenu !== key) {
          this.visibleSubMenu = key;
        } else {
          this.visibleSubMenu = null;
        }
      },
      coachRoute(name) {
        return { name, params: { classId: this.classId } };
      },
      deviceRoute(name) {
        let url = urls['kolibri:kolibri.plugins.device:device_management'];
        this.$router.push(url);
        this.$router.push(this.router.getRoute(name));
      },
    },
    $trs: {
      permissionsLabel: {
        message: 'Permissions',
        context: 'Refers to the Device > Permissions tab.',
      },
      infoLabel: {
        message: 'Info',
        context: 'Refers to the Device > Info tab.',
      },
      settingsLabel: {
        message: 'Settings',
        context: 'Refers to the Device > Settings tab.\n',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .wrapper {
    margin-top: 100px;
  }

  .container {
    margin: 8px;
  }

  .inline {
    display: inline-block;
    margin: 0 4px;
  }

  .link-container {
    height: 44px;
  }

  .link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 44px;
    margin-left: 40px;
    font-size: 12px;
    text-decoration: none;
  }

  /deep/ .button {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  /deep/ .prop-icon:last-child {
    margin-right: 8px;
    margin-bottom: 4px;
    margin-left: auto;
  }

  /deep/ .prop-icon:first-child {
    margin-bottom: 8px;
    margin-left: 4px;
  }

</style>
