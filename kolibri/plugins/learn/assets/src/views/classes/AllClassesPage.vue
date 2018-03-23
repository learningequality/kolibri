<template>

  <div>
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

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import ContentCard from '../content-card';
  import { classAssignmentsLink } from './classPageLinks';

  export default {
    name: 'allClassesPage',
    components: {
      ContentCard,
    },
    mixins: [responsiveWindow],
    computed: {
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
    vuex: {
      getters: {
        classrooms: state => state.pageState.classrooms,
      },
    },
    $trs: {
      allClassesHeader: 'Classes',
    },
  };

</script>


<style lang="stylus" scoped>

  .content-card
    margin-right: 16px
    margin-bottom: 16px

</style>
