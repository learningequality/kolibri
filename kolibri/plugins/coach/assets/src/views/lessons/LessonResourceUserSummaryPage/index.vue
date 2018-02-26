<template>

  <div>
    <section>
      <content-icon
        :kind="lessonResource.kind"
        class="kind-icon"
      />
      <h1 class="resource-title">
        {{ lessonResource.title }}
      </h1>
      <h3>
        {{ lessonResourceChannel.title }}
      </h3>
    </section>

    <section>
      <div v-for="student in lessonResourceReport" :key="student.pk">
        <p>{{ student.full_name }}</p>
        <p>{{ student.progress[0].total_progress }}</p>
      </div>
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
        currentLesson: state => state.pageState.currentLesson,
        lessonResource: state => state.pageState.lessonResource,
        learnerGroups: state => state.pageState.learnerGroups,
        lessonResourceReport: state => state.pageState.lessonResourceReport,
        lessonResourceChannel(state) {
          const { channel_id } = state.pageState.lessonResource;
          return state.core.channels.list.find(channel => channel.id === channel_id) || {};
        },
      },
      actions: {},
    },
    $trs: {
      previewContentButtonLabel: 'Preview',
      nameTableColumnHeader: 'Name',
      progressTableColumnHeader: 'Resource Progress',
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
