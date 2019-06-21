<template>

  <div>
    <div v-if="isUserLoggedIn ">
      <h2>{{ coreCommon$tr('classesLabel') }}</h2>
      <p v-if="!classrooms.length">
        {{ $tr('noClasses') }}
      </p>
      <div class="classrooms">
        <ContentCard
          v-for="c in classrooms"
          :key="c.id"
          class="content-card"
          :link="classAssignmentsLink(c.id)"
          :showContentIcon="false"
          :title="c.name"
          :kind="CLASSROOM"
          :isMobile="windowIsSmall"
        />
      </div>
    </div>
    <AuthMessage v-else authorizedRole="learner" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';
  import ContentCard from '../ContentCard';
  import { learnStringsMixin } from '../commonLearnStrings';
  import { classAssignmentsLink } from './classPageLinks';

  export default {
    name: 'AllClassesPage',
    metaInfo() {
      return {
        title: this.coreCommon$tr('classesLabel'),
      };
    },
    components: {
      AuthMessage,
      ContentCard,
    },
    mixins: [coreStringsMixin, responsiveWindow, learnStringsMixin],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState('classes', ['classrooms']),
      CLASSROOM() {
        return ContentNodeKinds.CLASSROOM;
      },
    },
    methods: {
      classAssignmentsLink,
    },
    $trs: {
      noClasses: 'You are not enrolled in any classes',
    },
  };

</script>


<style lang="scss" scoped>

  .content-card {
    margin-right: 16px;
    margin-bottom: 16px;
  }

</style>
