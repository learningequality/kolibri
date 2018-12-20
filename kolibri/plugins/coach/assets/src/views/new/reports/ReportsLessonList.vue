<template>

  <div class="new-coach-block">
    <ReportsHeader />
    <KSelect
      v-model="filter"
      :label="$tr('show')"
      :options="filterOptions"
      :inline="true"
    />
  </div>

</template>


<script>

  import KSelect from 'kolibri.coreVue.components.KSelect';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLessonList',
    components: {
      ReportsHeader,
      KSelect,
    },
    data() {
      return {
        filter: 'allLessons',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.$tr('allLessons'),
            value: 'allLessons',
          },
          {
            label: this.$tr('activeLessons'),
            value: 'activeLessons',
          },
          {
            label: this.$tr('inactiveLessons'),
            value: 'inactiveLessons',
          },
        ];
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    $trs: {
      show: 'Show',
      allLessons: 'All lessons',
      activeLessons: 'Active lessons',
      inactiveLessons: 'Inactive lessons',
    },
  };

</script>


<style lang="scss" scoped></style>
