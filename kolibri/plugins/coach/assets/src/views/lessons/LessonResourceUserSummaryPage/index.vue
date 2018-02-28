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
        </dl>
      </div>

      <k-router-link
        class="preview-button"
        appearance="raised-button"
        :text="$tr('previewContentButtonLabel')"
        :to="previewButtonRoute"
      />
    </section>

    <section>
      <core-table>
        <thead>
          <tr>
            <th class="visuallyhidden core-table-icon-col">
              <!-- holds the user icon, header not necessary? -->
              <!-- {{ $tr('userIconTableColumnHeader') }} -->
            </th>
            <th>
              {{ $tr('nameTableColumnHeader') }}
            </th>
            <th>
              {{ progressHeader }}
            </th>
            <th>
              {{ $tr('groupTableColumnHeader') }}

            </th>
            <th>
              {{ $tr('lastActiveTableColumnHeader') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(learner, id) in learnerRows"
            :key="id"
          >
            <td class="core-table-icon-col">
              <!-- IDEA separate column? -->
              <content-icon kind="user" />
            </td>
            <td>
              <!-- IDEA separate column? -->
              <k-router-link
                v-if="isExercise"
                :text="learner.name"
                :to="userReportRoute(id)"
              />
              <template v-else>
                {{ learner.name }}
              </template>
            </td>
            <td>
              <progress-bar
                :progress="learner.progress"
                :showPercentage="true"
              />
            </td>
            <td>
              {{ learner.groupName }}
            </td>
            <td>
              <elapsed-time
                v-if="learner.lastActive"
                :date="learner.lastActive"
              />
              <template v-else>
                -
              </template>
            </td>
          </tr>
        </tbody>
      </core-table>

    </section>
  </div>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { LessonsPageNames } from '../../../lessonsConstants';

  export default {
    name: 'lessonResourceUserSummaryPage',
    components: {
      contentIcon,
      CoreTable,
      progressBar,
      kRouterLink,
      elapsedTime,
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
    },
    vuex: {
      getters: {
        resourceTitle: state => state.pageState.resourceTitle,
        resourceKind: state => state.pageState.resourceKind,
        channelTitle: state => state.pageState.channelTitle,
        learnerRows: state => state.pageState.learnerRows,
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
      lastActiveLabel: '{numberOfHours,number, integer} hours ago',
      progressPercentage: '{progress, number, percent }', //pass in fraction. Handles math + %
    },
  };

</script>


<style lang="stylus" scoped>

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

</style>
