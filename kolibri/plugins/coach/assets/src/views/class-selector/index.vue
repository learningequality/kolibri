<template>

  <div>
    <router-link :to="classListPage"><h1>{{ $tr('allClasses') }}</h1></router-link>
    <span class="seperator">&#62;</span>
    <ui-select
      :name="$tr('selectClass')"
      :value="currentClass"
      :options="classOptions"
      @change="changeClass"
      class="class-selector"
    />
  </div>

</template>


<script>

  import orderBy from 'lodash/orderBy';
  import { PageNames } from '../../constants';
  import uiSelect from 'keen-ui/src/UiSelect';
  import uiIcon from 'keen-ui/src/UiIcon';
  export default {
    $trNameSpace: 'classSelector',
    $trs: {
      allClasses: 'All classes',
      selectClass: 'Class',
    },
    components: {
      uiSelect,
      uiIcon,
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
        return orderBy(this.classes, [classroom => classroom.name.toUpperCase()], ['asc']);
      },
      classOptions() {
        return this.sortedClasses.map(classroom => ({
          label: classroom.name,
          id: classroom.id,
        }));
      },
      currentClass() {
        return this.classOptions.find(classroom => classroom.id === this.currentClassId);
      },
      classListPage() {
        return { name: PageNames.CLASS_LIST };
      },
    },
    methods: {
      changeClass(classSelected) {
        this.$emit('changeClass', classSelected.id);
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
    vertical-align: bottom

  .seperator
    display: inline-block
    vertical-align: bottom
    padding-right: 0.25em
    padding-left: 0.25em
    padding-bottom: 23px

  a
    display: inline-block
    vertical-align: bottom
    margin-bottom: 2px

</style>
