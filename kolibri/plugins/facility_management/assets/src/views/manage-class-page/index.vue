<template>

  <div>

    <div class="header">
      <section>
        <h1>{{ $tr('adminClassPageHeader') }}</h1>
        <p>{{ $tr('adminClassPageSubheader') }}</p>
      </section>

      <k-button
        class="create-btn"
        :class="{ 'create-btn-mobile': windowSize.breakpoint <= 0}"
        @click="displayModal(Modals.CREATE_CLASS)"
        :text="$tr('addNew')"
        :primary="true"
      />
    </div>
    <core-table v-if="!noClassesExist">
      <caption class="visuallyhidden">{{ $tr('tableCaption') }}</caption>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('className') }}</th>
          <th>{{ $tr('coachesColumnHeader') }}</th>
          <th>{{ $tr('learnersColumnHeader') }}</th>
          <th>{{ $tr('actions') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr
          v-for="classroom in sortedClassrooms"
          :key="classroom.id"
        >
          <td class="core-table-icon-col">
            <ui-icon icon="business" />
          </td>
          <td class="core-table-main-col">
            <k-router-link
              :text="classroom.name"
              :to="classEditLink(classroom.id)"
            />
          </td>
          <td>
            {{ coachNames(classroom) }}
          </td>
          <td>
            {{ classroom.learner_count }}
          </td>
          <td>
            <k-button
              appearance="flat-button"
              @click="openDeleteClassModal(classroom)"
              :text="$tr('deleteClass')"
            />
          </td>
        </tr>
      </tbody>
    </core-table>

    <p v-else>{{ $tr('noClassesExist') }}</p>

    <class-delete-modal
      v-if="modalShown===Modals.DELETE_CLASS"
      :classid="currentClassDelete.id"
      :classname="currentClassDelete.name"
    />
    <class-create-modal
      v-if="modalShown===Modals.CREATE_CLASS"
      :classes="sortedClassrooms"
    />

  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import UiIcon from 'keen-ui/src/UiIcon';
  import { Modals, PageNames } from '../../constants';
  import { displayModal } from '../../state/actions';
  import orderBy from 'lodash/orderBy';
  import classCreateModal from './class-create-modal';
  import classDeleteModal from './class-delete-modal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  function classEditLink(classId) {
    return {
      name: PageNames.CLASS_EDIT_MGMT_PAGE,
      params: { id: classId },
    };
  }

  export default {
    name: 'manageClassPage',
    components: {
      coreTable,
      classCreateModal,
      classDeleteModal,
      kButton,
      kRouterLink,
      UiIcon,
    },
    mixins: [responsiveWindow],
    data: () => ({ currentClassDelete: null }),
    computed: {
      Modals: () => Modals,
      sortedClassrooms() {
        return orderBy(this.classes, [classroom => classroom.name.toUpperCase()], ['asc']);
      },
    },
    methods: {
      coachNames(classroom) {
        const { coaches } = classroom;
        const coach_names = coaches.map(({ full_name }) => full_name);
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
      classEditLink,
      openDeleteClassModal(classModel) {
        this.currentClassDelete = classModel;
        this.displayModal(Modals.DELETE_CLASS);
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
        classes: state => state.pageState.classes,
        noClassesExist: state => state.pageState.classes.length === 0,
      },
      actions: {
        displayModal,
      },
    },
    $trs: {
      adminClassPageHeader: 'Classes',
      adminClassPageSubheader: 'View and manage your classes',
      addNew: 'New class',
      deleteClass: 'Delete class',
      className: 'Class name',
      tableCaption: 'List of classes',
      learnersColumnHeader: 'Learners',
      coachesColumnHeader: 'Coaches',
      truncatedCoachNames:
        '{name1}, {name2}, {numRemaining, number} {numRemaining, plural, one {other} other {others}}',
      actions: 'Actions',
      noClassesExist: 'No classes exist.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .header
    position: relative
    padding-right: 150px
    margin-bottom: 16px

  .create-btn
    position: absolute
    display: block
    top: 0
    right: 0

  .create-btn-mobile
    position: relative
    display: inline-block
    right: 10px
    min-width: 150px

</style>
