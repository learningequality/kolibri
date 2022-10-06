<template>

  <div class="wrapper">
    <div
      v-for="(nestedObject, key) in navigationOptions"
      :key="key"
      class="container"
    >
      <KButton
        :icon="nestedObject.icon"
        class="inline"
        :text="coreString(nestedObject.text)"
        appearance="flat-button"
        :iconAfter="visibleSubMenu === key ? 'chevronUp' : 'chevronDown'"
        @click="manageDisplay(key)"
      />
      <div v-if="visibleSubMenu === key">
        <div
          v-for="(nestedKey, item) in nestedObject.subNavigation"
          :key="item.value"
          class="link-container"
        >
          <router-link
            v-if="nestedKey.condition ? nestedKey.condition : true"
            :to="nestedKey.route"
            class="link"
          >
            {{ coreString(nestedKey.text) }}
          </router-link>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  // import commonLearnStrings from 'kolibri.coreVue.mixins.commonLearnStrings';
  import { mapState } from 'vuex';
  import { PageNames as LearnPageNames } from './../../../../plugins/learn/assets/src/constants';
  import { PageNames as FacilityPageNames } from './../../../../plugins/facility/assets/src/constants';
  import { PageNames as CoachPageNames } from './../../../../plugins/coach/assets/src/constants';

  export default {
    name: 'AndroidNavigationNestedMenu',
    mixins: [commonCoreStrings],
    data() {
      return {
        visibleSubMenu: null,
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
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
                text: 'classHome',
                route: this.coachRoute('HomePage'),
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
            subNavigation: {
              facilityClasses: {
                text: 'classesLabel',
                link: this.$router.getRoute(FacilityPageNames.CLASS_MGMT_PAGE),
              },
              facilityUsers: {
                text: 'usersLabel',
                link: this.$router.getRoute(FacilityPageNames.USER_MGMT_PAGE),
              },
              facilitySettings: {
                text: 'settings',
                link: this.$router.getRoute(FacilityPageNames.FACILITY_CONFIG_PAGE),
              },
              facilityData: {
                text: 'data',
                link: this.$router.getRoute(FacilityPageNames.DATA_EXPORT_PAGE),
              },
            },
          },
          deviceSubnav: {
            icon: 'device',
            text: 'deviceManagementTitle',
            subNavigation: {
              channels: {
                text: this.coreString('channelsLabel'),
                link: this.$router.getRoute('MANAGE_CONTENT_PAGE'),
              },
              permissions: {
                text: this.$tr('permissionsLabel'),
                link: this.$router.getRoute('MANAGE_PERMISSIONS_PAGE'),
              },
              facilities: {
                text: this.coreString('facilitiesLabel'),
                link: this.$router.getRoute('FACILITIES_PAGE'),
              },
              info: {
                text: this.$tr('infoLabel'),
                link: this.$router.getRoute('DEVICE_INFO_PAGE'),
              },
              settings: {
                text: this.$tr('settingsLabel'),
                link: this.$router.getRoute('DEVICE_SETTINGS_PAGE'),
              },
            },
          },
        };
      },
    },
    methods: {
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
    margin: 24px 100px;
  }

  .inline {
    display: inline-block;
    margin: 0 4px;
  }

  .link-container {
    margin: 20px;
  }

  .link {
    padding: 10px;
    margin: 20px 44px;
    text-decoration: none;
    border: 1px solid;
  }

</style>
