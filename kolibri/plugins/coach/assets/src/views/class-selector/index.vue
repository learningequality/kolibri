<template>

  <ui-select
    :name="$tr('selectClass')"
    :label="$tr('selectClass')"
    :value="currentClass"
    :options="classOptions"
    @change="changeClass"
    class="class-selector"
  />

</template>


<script>

  const orderBy = require('lodash/orderBy');

  module.exports = {
    $trNameSpace: 'classSelector',
    $trs: {
      selectClass: 'Class',
    },
    components: {
      'ui-select': require('keen-ui/src/UiSelect'),
    },
    props: {
      classes: {
        type: Array,
        required: true,
      },
      currentClassId: {
        type: String,
        required: true,
      },
    },
    computed: {
      sortedClasses() {
        return orderBy(
          this.classes,
          [classroom => classroom.name.toUpperCase()],
          ['asc']
        );
      },
      classOptions() {
        return this.sortedClasses.map(classroom => ({ label: classroom.name, id: classroom.id }));
      },
      currentClass() {
        return this.classOptions.find(classroom => classroom.id === this.currentClassId);
      },
    },
    methods: {
      changeClass(classSelected) {
        this.$router.push({
          params: { classId: classSelected.id },
        });
      },
    },
  };

</script>


<style lang="stylus">

  .class-selector
    .ui-select__display-value
      font-size: 1.5em
      font-weight: bold

</style>


<style lang="stylus" scoped>

  .class-selector
    display: inline-flex

</style>
