<template>

  <div class="resource-user-summary-page">
    <section class="top">
      <div class="resource-data">
        <!-- IDEA use datalist for h1 too -->
        <h1>
          <ContentIcon :kind="resourceKind" />
          {{ resourceTitle }}
        </h1>
        <dl>
          <dt class="visuallyhidden">
            {{ $tr('channelTitleLabel') }}
          </dt>
          <dd>
            {{ channelTitle }}
          </dd>
          <dd>
            <CoachContentLabel
              class="coach-content-label"
              :value="contentNode.num_coach_contents"
              :isTopic="false"
            />
          </dd>
        </dl>
      </div>

      <KRouterLink
        class="preview-button"
        appearance="raised-button"
        :text="$tr('previewContentButtonLabel')"
        :to="previewButtonRoute"
      />
    </section>

    <!-- TODO consolidate with facility_management user-list -->
    <section>
      <CoreTable>
        <thead>
          <tr>
            <th class="visuallyhidden core-table-icon-col">
              <!-- holds the user icon, header not necessary? -->
              <!-- {{ $tr('userIconTableColumnHeader') }} -->
            </th>
            <th>
              <KButton
                class="header-button"
                appearance="basic-link"
                :text="$tr('fullnameTableColumnHeader')"
                @click="setSort('name')"
              />
              <!-- TODO should probably use constants -->
              <UiIconButton
                v-if="sortBy==='name'"
                size="small"
                type="secondary"
                @click="invert=!invert"
              >
                <mat-svg
                  v-if="invert"
                  name="keyboard_arrow_up"
                  category="hardware"
                />
                <mat-svg
                  v-if="!invert"
                  name="keyboard_arrow_down"
                  category="hardware"
                />
              </UiIconButton>
            </th>
            <th>
              <KButton
                class="header-button"
                appearance="basic-link"
                :text="progressHeader"
                @click="setSort('progress')"
              />
              <UiIconButton
                v-if="sortBy==='progress'"
                size="small"
                type="secondary"
                @click="invert=!invert"
              >
                <mat-svg
                  v-if="invert"
                  name="keyboard_arrow_up"
                  category="hardware"
                />
                <mat-svg
                  v-if="!invert"
                  name="keyboard_arrow_down"
                  category="hardware"
                />
              </UiIconButton>
            </th>
            <th>
              <KButton
                class="header-button"
                appearance="basic-link"
                :text="$tr('groupTableColumnHeader')"
                @click="setSort('groupName')"
              />
              <UiIconButton
                v-if="sortBy==='groupName'"
                size="small"
                type="secondary"
                @click="invert=!invert"
              >
                <mat-svg
                  v-if="invert"
                  name="keyboard_arrow_up"
                  category="hardware"
                />
                <mat-svg
                  v-if="!invert"
                  name="keyboard_arrow_down"
                  category="hardware"
                />
              </UiIconButton>

            </th>
            <th>
              <KButton
                class="header-button"
                appearance="basic-link"
                :text="$tr('lastActiveTableColumnHeader')"
                @click="setSort('lastActive')"
              />
              <UiIconButton
                v-if="sortBy==='lastActive'"
                size="small"
                type="secondary"
                @click="invert=!invert"
              >
                <mat-svg
                  v-if="invert"
                  name="keyboard_arrow_up"
                  category="hardware"
                />
                <mat-svg
                  v-if="!invert"
                  name="keyboard_arrow_down"
                  category="hardware"
                />
              </UiIconButton>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
          >
            <td class="core-table-icon-col">
              <!-- IDEA separate column? -->
              <ContentIcon kind="user" />
            </td>
            <td>
              <!-- IDEA separate column? -->
              <KRouterLink
                v-if="isExercise"
                :text="user.name"
                :to="userReportRoute(user.id)"
              />
              <template v-else>
                {{ user.name }}
              </template>
            </td>
            <td>
              <ProgressBar
                :progress="user.progress"
                :showPercentage="true"
              />
            </td>
            <td>
              {{ user.groupName }}
            </td>
            <td>
              <ElapsedTime
                v-if="user.lastActive"
                :date="new Date(user.lastActive)"
              />
              <template v-else>
                -
              </template>
            </td>
          </tr>
        </tbody>
      </CoreTable>

      <p v-if="!userData.length">
        {{ $tr('userTableEmptyMessage') }}
      </p>

    </section>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
  import KButton from 'kolibri.coreVue.components.KButton';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import ProgressBar from 'kolibri.coreVue.components.ProgressBar';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  // TODO add to core
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { filterAndSortUsers } from '../../../../../facility_management/assets/src/userSearchUtils';
  import { LessonsPageNames } from '../../constants/lessonsConstants';

  export default {
    name: 'LessonResourceUserSummaryPage',
    metaInfo() {
      return {
        title: this.resourceTitle,
      };
    },
    components: {
      CoachContentLabel,
      ContentIcon,
      CoreTable,
      ProgressBar,
      KRouterLink,
      KButton,
      UiIconButton,
      ElapsedTime,
    },
    data() {
      return {
        sortBy: 'name',
        invert: false,
      };
    },
    computed: {
      ...mapState(['reportRefreshInterval']),
      ...mapState('lessonResourceUserSummary', [
        'channelTitle',
        'contentNode',
        'resourceKind',
        'resourceTitle',
        'userData',
      ]),
      classId() {
        return this.$route.params.classId;
      },
      isExercise() {
        return this.resourceKind === ContentNodeKinds.EXERCISE;
      },
      progressHeader() {
        if (this.isExercise) {
          return this.$tr('exerciseProgressTableColumnHeader');
        }
        return this.$tr('progressTableColumnHeader');
      },
      previewButtonRoute() {
        // TODO make separate route, remove the select/deselect ability + change back route
        return {
          name: LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
        };
      },
      sortedUsers() {
        return filterAndSortUsers(this.userData, () => true, this.sortBy);
      },
      users() {
        return this.invert ? Array.from(this.sortedUsers).reverse() : this.sortedUsers;
      },
    },
    mounted() {
      this.intervalId = setInterval(this.refreshReportData, this.reportRefreshInterval);
    },
    beforeDestroy() {
      this.intervalId = clearInterval(this.intervalId);
    },
    methods: {
      // Data to do a proper refresh. See showLessonResourceUserSummaryPage for details.
      refreshReportData() {
        this.$store.dispatch('lessonResourceUserSummary/setUserData', {
          channelId: this.contentNode.channel_id,
          contentNodeId: this.contentNode.id,
          classId: this.classId,
          isSamePage: samePageCheckGenerator(this.$store),
        });
      },
      userReportRoute(userId) {
        return {
          name: LessonsPageNames.RESOURCE_USER_REPORT_ROOT,
          params: {
            userId,
          },
        };
      },
      setSort(sortKey) {
        this.sortBy = sortKey;
        this.invert = false;
      },
    },
    $trs: {
      channelTitleLabel: 'Channel',
      resourceTitleLabel: 'Resource',
      exerciseTitleLabel: 'Exercise',
      previewContentButtonLabel: 'Preview',
      fullnameTableColumnHeader: 'Full name',
      progressTableColumnHeader: 'Resource Progress',
      exerciseProgressTableColumnHeader: 'Exercise Progress',
      groupTableColumnHeader: 'Group',
      lastActiveTableColumnHeader: 'Last Active',
      userTableEmptyMessage: 'This lesson is not visible to any users',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .coach-content-label {
    padding: 8px 0;
  }

  .kind-icon {
    display: inline-block;
    margin-right: 0.5em;
    font-size: 1.8em;
    /deep/ .ui-icon {
      vertical-align: bottom;
    }
  }

  dl,
  dt,
  dd {
    display: block;
    margin: 0;
  }

  .top {
    position: relative;
  }

  .preview-button {
    position: absolute;
    top: 0;
    right: 0;
    max-width: 10%;
  }

  .resource-data {
    max-width: 90%;
  }

  .header-button {
    color: $core-text-default;
    text-decoration: none;
  }

</style>
