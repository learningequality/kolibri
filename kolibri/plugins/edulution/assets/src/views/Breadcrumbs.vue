<template>

  <div class="learn-breadcrumbs">
    <KBreadcrumbs v-if="inLearn" :items="learnBreadcrumbs" />
    <KBreadcrumbs v-else-if="inTopics" :items="topicsBreadcrumbs" />
    <KBreadcrumbs v-else-if="showClassesBreadcrumbs" :items="classesBreadcrumbs" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import { PageNames, PageModes } from '../constants';
  import classesBreadcrumbItems from './classes/classesBreadcrumbItems';

  export default {
    name: 'Breadcrumbs',
    $trs: {
      recommended: 'Recommended',
      channels: 'Channels',
    },
    components: { KBreadcrumbs },
    mixins: [classesBreadcrumbItems],
    computed: {
      ...mapGetters(['pageMode']),
      ...mapState(['pageName']),
      ...mapState('topicsTree', {
        channelRootId: state => (state.channel || {}).root_id,
        channelTitle: state => (state.channel || {}).title,
        topicTitle: state => (state.topic || {}).title,
        topicId: state => (state.topic || {}).id,
        contentTitle: state => (state.content || {}).title,
        crumbs: state => (state.content || {}).breadcrumbs || (state.topic || {}).breadcrumbs || [],
      }),
      inLearn() {
        return this.pageMode === PageModes.RECOMMENDED && this.pageName !== PageNames.RECOMMENDED;
      },
      inTopics() {
        return this.pageMode === PageModes.TOPICS && this.pageName !== PageNames.TOPICS_ROOT;
      },
      learnBreadcrumbs() {
        return [
          {
            text: this.$tr('recommended'),
            link: { name: PageNames.RECOMMENDED },
          },
          { text: this.contentTitle },
        ];
      },
      middleTopicBreadcrumbs() {
        function crumb(text, id) {
          return {
            text: text,
            link: {
              name: PageNames.KNOWLEDGE_MAP,
              params: {
                id: id,
              },
            },
          };
        }

        let crumbs = [];
        if (this.topicId !== this.channelRootId) {
          crumbs.push(crumb(this.channelTitle, this.channelRootId));
        }
        this.crumbs.forEach(c => {
          crumbs.push(crumb(c.title, c.id));
        });
        return crumbs;
      },
      lastTopicBreadcrumb() {
        if (this.pageName === PageNames.TOPICS_CONTENT) {
          return { text: this.contentTitle };
        } else if (this.pageName === PageNames.KNOWLEDGE_MAP) {
          return { text: this.topicTitle };
        }
      },
      topicsBreadcrumbs() {
        return [
          // All Channels Link
          {
            text: this.$tr('channels'),
            link: { name: PageNames.TOPICS_ROOT },
          },
          ...this.middleTopicBreadcrumbs,
          this.lastTopicBreadcrumb,
        ];
      },
    },
    methods: {
      topicCrumbLinks(crumbs) {
        return crumbs.map(({ title, id }) => ({
          text: title,
          link: {
            name: PageNames.KNOWLEDGE_MAP,
            params: { id },
          },
        }));
      },
    },
  };

</script>


<style lang="scss" scoped></style>
