<template>

  <div>
    <h1 class="classes-link"><router-link :to="classListPage">{{ $tr('allClasses') }}</router-link></h1>
    <k-select
      :label="$tr('selectClass')"
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
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import uiIcon from 'keen-ui/src/UiIcon';
  export default {
    name: 'classSelector',
    $trs: {
      allClasses: 'All classes',
      selectClass: 'Class',
    },
    components: {
      kSelect,
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
          value: classroom.id,
        }));
      },
      currentClass() {
        return this.classOptions.find(classroom => classroom.value === this.currentClassId);
      },
      classListPage() {
        return { name: PageNames.CLASS_LIST };
      },
    },
    methods: {
      changeClass(classSelected) {
        this.$emit('changeClass', classSelected.value);
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
    display: inline-block
    vertical-align: bottom

  .classes-link
    display: inline-block
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px
      vertical-align: top

  a
    display: inline-block
    vertical-align: bottom
    margin-bottom: 2px

</style>
