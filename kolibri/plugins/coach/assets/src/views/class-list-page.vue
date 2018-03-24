<template>

  <div>

    <auth-message
      v-if="noClassesExist"
      :header="$tr('noAssignedClassesHeader')"
      :details="$tr('noAssignedClassesDetails')"
    />

    <template v-else>
      <section>
        <h1>{{ $tr('classPageHeader') }}</h1>
        <p>{{ $tr('classPageSubheader') }}</p>
      </section>

      <core-table>
        <caption class="visuallyhidden">{{ $tr('tableCaption') }}</caption>
        <thead slot="thead">
          <tr>
            <th class="core-table-icon-col"></th>
            <th class="core-table-main-col">{{ $tr('classroomName') }}</th>
            <th>{{ $tr('coachesColumnHeader') }}</th>
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
            <td>{{ coachNames(classroom) }}</td>
            <td>{{ classroom.learner_count }}</td>
          </tr>
        </tbody>
      </core-table>
    </template>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import ContentIcon from 'kolibri.coreVue.components.contentIcon';
  import { PageNames } from '../constants';
  import orderBy from 'lodash/orderBy';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import { filterAndSortUsers } from '../../../../facility_management/assets/src/userSearchUtils';

  function learnerPageLink(classId) {
    return {
      name: PageNames.LEARNER_LIST,
      params: { classId },
    };
  }

  export default {
    name: 'classListPage',
    components: {
      authMessage,
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
      // Duplicated in manage-classroom-page
      coachNames(classroom) {
        const { coaches } = classroom;
        const coach_names = filterAndSortUsers(coaches, () => true, 'full_name').map(
          ({ full_name }) => full_name
        );
        if (coach_names.length === 0) {
          return '–';
        }
        if (coach_names.length <= 2) {
          return coach_names.join(', ');
        }
        return this.$tr('truncatedCoachNames', {
          name1: coach_names[0],
          name2: coach_names[1],
          numRemaining: coach_names.length - 2,
        });
      },
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
      noAssignedClassesHeader: "You aren't assigned to any classes",
      noAssignedClassesDetails:
        'To start coaching a class, please consult your Kolibri administrator',
      coachesColumnHeader: 'Coaches',
      learnerColumnHeader: 'Learners',
      classIconTableDescription: 'Class icon',
      truncatedCoachNames:
        '{name1}, {name2}, {numRemaining, number} {numRemaining, plural, one {other} other {others}}',
    },
  };

</script>


<style lang="stylus" scoped></style>
