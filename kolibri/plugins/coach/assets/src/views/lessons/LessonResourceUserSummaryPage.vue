<template>

  <div class="resource-user-summary-page">
    <section class="top">
      <div class="resource-data">
        <!-- IDEA use datalist for h1 too -->
        <h1>
          <content-icon :kind="resourceKind" />
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
            <coach-content-label
              class="coach-content-label"
              :value="contentNode.num_coach_contents"
              :isTopic="false"
            />
          </dd>
        </dl>
      </div>

      <k-router-link
        class="preview-button"
        appearance="raised-button"
        :text="$tr('previewContentButtonLabel')"
        :to="previewButtonRoute"
      />
    </section>

    <!-- TODO consolidate with facility_management user-list -->
    <section>
      <core-table>
        <thead>
          <tr>
            <th class="visuallyhidden core-table-icon-col">
              <!-- holds the user icon, header not necessary? -->
              <!-- {{ $tr('userIconTableColumnHeader') }} -->
            </th>
            <th>
              <k-button
                @click="setSort('name')"
                class="header-button"
                appearance="basic-link"
                :text="$tr('nameTableColumnHeader')"
              />
              <!-- TODO should probably use constants -->
              <ui-icon-button
                v-if="sortBy==='name'"
                @click="invert=!invert"
                size="small"
                type="secondary"
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
              </ui-icon-button>
            </th>
            <th>
              <k-button
                @click="setSort('progress')"
                class="header-button"
                appearance="basic-link"
                :text="progressHeader"
              />
              <ui-icon-button
                v-if="sortBy==='progress'"
                @click="invert=!invert"
                size="small"
                type="secondary"
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
              </ui-icon-button>
            </th>
            <th>
              <k-button
                @click="setSort('groupName')"
                class="header-button"
                appearance="basic-link"
                :text="$tr('groupTableColumnHeader')"
              />
              <ui-icon-button
                v-if="sortBy==='groupName'"
                @click="invert=!invert"
                size="small"
                type="secondary"
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
              </ui-icon-button>

            </th>
            <th>
              <k-button
                @click="setSort('lastActive')"
                class="header-button"
                appearance="basic-link"
                :text="$tr('lastActiveTableColumnHeader')"
              />
              <ui-icon-button
                v-if="sortBy==='lastActive'"
                @click="invert=!invert"
                size="small"
                type="secondary"
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
              </ui-icon-button>
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
              <content-icon kind="user" />
            </td>
            <td>
              <!-- IDEA separate column? -->
              <k-router-link
                v-if="isExercise"
                :text="user.name"
                :to="userReportRoute(user.id)"
              />
              <template v-else>
                {{ user.name }}
              </template>
            </td>
            <td>
              <progress-bar
                :progress="user.progress"
                :showPercentage="true"
              />
            </td>
            <td>
              {{ user.groupName }}
            </td>
            <td>
              <elapsed-time
                v-if="user.lastActive"
                :date="new Date(user.lastActive)"
              />
              <template v-else>
                -
              </template>
            </td>
          </tr>
        </tbody>
      </core-table>

      <p v-if="!userData.length">
        {{ $tr('userTableEmptyMessage') }}
      </p>

    </section>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';
  // TODO add to core
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { filterAndSortUsers } from '../../../../../facility_management/assets/src/userSearchUtils';
  import { LessonsPageNames } from '../../constants/lessonsConstants';

  export default {
    name: 'lessonResourceUserSummaryPage',
    components: {
      coachContentLabel,
      contentIcon,
      coreTable,
      progressBar,
      kRouterLink,
      kButton,
      uiIconButton,
      elapsedTime,
    },
    data() {
      return {
        sortBy: 'name',
        invert: false,
      };
    },
    computed: {
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
    methods: {
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
    vuex: {
      getters: {
        resourceTitle: state => state.pageState.resourceTitle,
        resourceKind: state => state.pageState.resourceKind,
        channelTitle: state => state.pageState.channelTitle,
        userData: state => state.pageState.userData,
        contentNode: state => state.pageState.contentNode,
      },
      actions: {},
    },
    $trs: {
      channelTitleLabel: 'Channel',
      resourceTitleLabel: 'Resource',
      exerciseTitleLabel: 'Exercise',
      previewContentButtonLabel: 'Preview',
      nameTableColumnHeader: 'Name',
      progressTableColumnHeader: 'Resource Progress',
      exerciseProgressTableColumnHeader: 'Exercise Progress',
      groupTableColumnHeader: 'Group',
      lastActiveTableColumnHeader: 'Last Active',
      userTableEmptyMessage: 'This lesson is not visible to any users',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .coach-content-label
    padding: 8px 0

  .kind-icon
    display: inline-block
    font-size: 1.8em
    margin-right: 0.5em
    >>>.ui-icon
      vertical-align: bottom

  dl, dt, dd
    margin: 0
    display: block

  .top
    position: relative

  .preview-button
    position: absolute
    top: 0
    right: 0
    max-width: 10%

  .resource-data
    max-width: 90%

  .header-button
    text-decoration: none
    color: $core-text-default

</style>
