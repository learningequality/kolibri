<template>

  <div>
    <h1>{{ $tr('allClassesHeader') }}</h1>

    <div class="classrooms">
      <content-card
        class="content-card"
        v-for="c in classrooms"
        :key="c.id"
        :link="assignmentsLink(c)"
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
  import { ClassesPageNames } from '../constants';
  import ContentCard from './content-card';

  function assignmentsLink({ id }) {
    return {
      name: ClassesPageNames.CLASS_ASSIGNMENTS,
      params: { classId: id },
    };
  }

  export default {
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
      assignmentsLink,
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
