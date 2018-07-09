<template>

  <div>
    <div v-if="isUserLoggedIn ">
      <h2>{{ $tr('allClassesHeader') }}</h2>

      <div class="classrooms">
        <content-card
          class="content-card"
          v-for="c in classrooms"
          :key="c.id"
          :link="classAssignmentsLink(c.id)"
          :showContentIcon="false"
          :title="c.name"
          :kind="CLASSROOM"
          :isMobile="isMobile"
        />
      </div>
    </div>
    <auth-message authorizedRole="learner" v-else />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.authMessage';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import ContentCard from '../content-card';
  import { classAssignmentsLink } from './classPageLinks';

  export default {
    name: 'allClassesPage',
    components: {
      AuthMessage,
      ContentCard,
    },
    mixins: [responsiveWindow],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState({
        classrooms: state => state.pageState.classrooms,
      }),
      isMobile() {
        return this.windowSize.breakpoint <= 1;
      },
      CLASSROOM() {
        return ContentNodeKinds.CLASSROOM;
      },
    },
    methods: {
      classAssignmentsLink,
    },
    $trs: {
      allClassesHeader: 'Classes',
    },
  };

</script>


<style lang="scss" scoped>

  .content-card {
    margin-right: 16px;
    margin-bottom: 16px;
  }

</style>
