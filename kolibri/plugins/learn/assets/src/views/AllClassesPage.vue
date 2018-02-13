<template>

  <div>
    <h1>{{ $tr('allClassesHeader') }}</h1>

    <div class="classrooms">
      <router-link
        v-for="c in classrooms"
        :key="c.id"
        :to="assignmentsLink(c)"
      >
        <p>
          {{ c.name }}
        </p>
      </router-link>
    </div>
  </div>

</template>


<script>

  import { ClassesPageNames } from '../constants';

  function assignmentsLink({ id }) {
    return {
      name: ClassesPageNames.CLASS_ASSIGNMENTS,
      params: { classId: id },
    };
  }

  export default {
    components: {},
    computed: {},
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


<style lang="stylus" scoped></style>
