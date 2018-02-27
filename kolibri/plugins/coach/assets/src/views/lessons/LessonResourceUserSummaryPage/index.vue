<template>

  <div>
    lesson resource user summary
    <section>
      <!-- IDEA use datalist for this information -->

      <!-- TODO resource icon -->
      <h1>
        <!-- TODO resource title -->
      </h1>
      <dl>
        <dt>
          <!-- TODO channel name Label -->
        </dt>
        <dd>
          <!-- TODO channel name -->
        </dd>
      </dl>
    </section>

    <section>
      <!-- TODO preview button on the right -->
      <!-- TODO write action that displays the page without selection information -->

      <core-table>
        <thead>
          <tr>
            <th>
              <!-- TODO name header -->
            </th>
            <th>
              <!-- TODO progress header -->
            </th>
            <th>
              <!-- TODO group header -->
            </th>
            <th>
              <!-- TODO last active header -->
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <!-- TODO user icon -->
              <!-- TODO user fullname -->
            </td>
            <td>
              <!-- TODO progress bar w/ progressPercentage -->
            </td>
            <td>
              <!-- TODO group this user belongs to -->
            </td>
            <td>
              <!-- TODO lastactive -->
            </td>
          </tr>
        </tbody>
      </core-table>

    </section>
  </div>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';

  export default {
    name: 'lessonResourceUserSummaryPage',
    components: {
      contentIcon,
    },
    computed: {},
    methods: {},
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

  .resource-title
    display: inline-block

  .kind-icon
    display: inline-block
    font-size: 1.8em
    margin-right: 0.5em
    >>>.ui-icon
      vertical-align: bottom

</style>
