<template>

  <LearnImmersiveLayout
    v-if="currentPageIsContent"
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
    :back="learnBackPageRoute"
    :content="content"
  />

  <NotificationsRoot
    v-else
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <div>
      <router-view />
    </div>

  </NotificationsRoot>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import { PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';
  import LearnImmersiveLayout from './LearnImmersiveLayout';
  import plugin_data from 'plugin_data';

  export default {
    name: 'LearnIndex',
    components: {
      NotificationsRoot,
      LearnImmersiveLayout,
    },
    mixins: [commonCoreStrings, commonLearnStrings, responsiveWindowMixin],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState('topicsTree', ['content']),
      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (
          (plugin_data.allowGuestAccess && this.$store.getters.allowAccess) || this.isUserLoggedIn
        );
      },
      currentPageIsContent() {
        return this.$route.name === PageNames.TOPICS_CONTENT;
      },
      // currentTopicIsCustom() {
      //   return (
      //     this.topic && this.topic.options && this.topic.options.modality === 'CUSTOM_NAVIGATION'
      //   );
      // },
      learnBackPageRoute() {
        // extract the key pieces of routing from immersive page props, but since we don't need
        // them all, just create two alternative route paths for return/'back' navigation
        let route = {};
        const query = { ...this.$route.query };
        delete query.last;
        delete query.topicId;
        if (
          this.$route.query.last === PageNames.TOPICS_TOPIC_SEARCH ||
          this.$route.query.last === PageNames.TOPICS_TOPIC
        ) {
          const lastId = this.$route.query.topicId
            ? this.$route.query.topicId
            : this.content.parent;
          const lastPage = this.$route.query.last;
          // Need to guard for parent being non-empty to avoid console errors
          route = this.$router.getRoute(
            lastPage,
            {
              id: lastId,
            },
            query
          );
        } else if (this.$route.query && this.$route.query.last === PageNames.LIBRARY) {
          const lastPage = this.$route.query.last;
          route = this.$router.getRoute(lastPage, {}, query);
        } else if (this.$route.query && this.$route.query.last) {
          const last = this.$route.query.last;
          route = this.$router.getRoute(last, query);
        } else {
          route = this.$router.getRoute(PageNames.HOME);
        }
        return route;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';

  .content {
    height: 100%;
    margin: auto;
  }

</style>
