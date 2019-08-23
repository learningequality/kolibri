<template>

  <div>
    <div v-if="isUserLoggedIn ">
      <h1>{{ coreString('classesLabel') }}</h1>
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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ContentCard from '../ContentCard';
  import commonLearnStrings from '../commonLearnStrings';
  import { classAssignmentsLink } from './classPageLinks';

  export default {
    name: 'AllClassesPage',
    metaInfo() {
      return {
        title: this.coreString('classesLabel'),
      };
    },
    components: {
      AuthMessage,
      ContentCard,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin, commonLearnStrings],
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
