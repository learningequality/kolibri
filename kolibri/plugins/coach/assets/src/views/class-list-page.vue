<template>

  <div>

    <section>
      <h1>{{ $tr('classPageHeader') }}</h1>
      <p>{{ $tr('classPageSubheader') }}</p>
    </section>

    <core-table v-if="!noClassesExist">
      <caption class="visuallyhidden">{{ $tr('tableCaption') }}</caption>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('classroomName') }}</th>
          <th>{{ $tr('learnerColumnHeader') }}</th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr
          v-for="classroom in sortedClasses"
          :key="classroom.id"
        >
          <td class="core-table-icon-col">
            <content-icon :kind="CLASSROOM" />
          </td>
          <td class="core-table-main-col">
            <k-router-link
              :text="classroom.name"
              :to="learnerPageLink(classroom.id)"
            />
          </td>
          <td>{{ classroom.learner_count }}</td>
        </tr>
      </tbody>
    </core-table>

    <p v-else>{{ $tr('noClassesExist') }}</p>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import ContentIcon from 'kolibri.coreVue.components.contentIcon';
  import { PageNames } from '../constants';
  import orderBy from 'lodash/orderBy';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  function learnerPageLink(classId) {
    return {
      name: PageNames.LEARNER_LIST,
      params: { classId },
    };
  }

  export default {
    name: 'classListPage',
    components: {
      coreTable,
      ContentIcon,
      kRouterLink,
    },
    computed: {
      CLASSROOM: () => ContentNodeKinds.CLASSROOM,
      sortedClasses() {
        return orderBy(this.classList, [classroom => classroom.name.toUpperCase()], ['asc']);
      },
    },
    methods: {
      learnerPageLink,
    },
    vuex: {
      getters: {
        classList: state => state.classList,
        noClassesExist: state => state.classList.length === 0,
      },
    },
    $trs: {
      classPageHeader: 'Classes',
      classPageSubheader: 'View learner progress and class performance',
      classroomName: 'Class name',
      tableCaption: 'List of classes',
      noClassesExist: 'No classes exist',
      coachesColumnHeader: 'Coaches',
      learnerColumnHeader: 'Learners',
      classIconTableDescription: 'Class icon',
    },
  };

</script>


<style lang="stylus" scoped></style>
