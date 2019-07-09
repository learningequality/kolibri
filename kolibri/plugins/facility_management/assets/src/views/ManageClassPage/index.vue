<template>

  <div>

    <KGrid>
      <KGridItem sizes="100, 75, 75" percentage>
        <h1>{{ $tr('adminClassPageHeader') }}</h1>
        <p>{{ $tr('adminClassPageSubheader') }}</p>
      </KGridItem>
      <KGridItem sizes="100, 25, 25" percentage alignment="right">
        <KButton
          :text="$tr('addNew')"
          :primary="true"
          class="move-down"
          @click="displayModal(Modals.CREATE_CLASS)"
        />
      </KGridItem>
    </KGrid>

    <CoreTable>
      <caption class="visuallyhidden">
        {{ $tr('tableCaption') }}
      </caption>
      <thead slot="thead">
        <tr>
          <th>{{ $tr('className') }}</th>
          <th>{{ $tr('coachesColumnHeader') }}</th>
          <th>{{ $tr('learnersColumnHeader') }}</th>
          <th>
            <span class="visuallyhidden">
              {{ $tr('actions') }}
            </span>
          </th>
        </tr>
      </thead>
      <transition-group slot="tbody" tag="tbody" name="list">
        <tr
          v-for="classroom in sortedClassrooms"
          :key="classroom.id"
        >
          <td>
            <KLabeledIcon icon="classroom">
              <KRouterLink
                :text="classroom.name"
                :to="classEditLink(classroom.id)"
              />
            </KLabeledIcon>
          </td>
          <td>
            <span :ref="`coachNames${classroom.id}`">
              <template v-if="coachNames(classroom).length">
                {{ formattedCoachNames(classroom) }}
              </template>
              <KEmptyPlaceholder v-else />
            </span>
            <KTooltip
              v-if="formattedCoachNamesTooltip(classroom)"
              :reference="`coachNames${classroom.id}`"
              :refs="$refs"
            >
              {{ formattedCoachNamesTooltip(classroom) }}
            </KTooltip>
          </td>

          <td>
            {{ classroom.learner_count }}
          </td>
          <td class="core-table-button-col">
            <KButton
              appearance="flat-button"
              :text="$tr('deleteClass')"
              @click="openDeleteClassModal(classroom)"
            />
          </td>
        </tr>
      </transition-group>
    </CoreTable>

    <p v-if="noClassesExist">
      {{ $tr('noClassesExist') }}
    </p>

    <ClassDeleteModal
      v-if="modalShown===Modals.DELETE_CLASS"
      :classid="currentClassDelete.id"
      :classname="currentClassDelete.name"
      @cancel="closeModal"
    />
    <ClassCreateModal
      v-if="modalShown===Modals.CREATE_CLASS"
      :classes="sortedClassrooms"
      @cancel="closeModal"
    />

  </div>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import orderBy from 'lodash/orderBy';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';
  import KEmptyPlaceholder from 'kolibri.coreVue.components.KEmptyPlaceholder';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import { Modals, PageNames } from '../../constants';
  import ClassCreateModal from './ClassCreateModal';
  import ClassDeleteModal from './ClassDeleteModal';

  function classEditLink(classId) {
    return {
      name: PageNames.CLASS_EDIT_MGMT_PAGE,
      params: { id: classId },
    };
  }

  export default {
    name: 'ManageClassPage',
    metaInfo() {
      return {
        title: this.$tr('adminClassPageHeader'),
      };
    },
    components: {
      CoreTable,
      ClassCreateModal,
      ClassDeleteModal,
      KButton,
      KRouterLink,
      KGrid,
      KGridItem,
      KLabeledIcon,
      KTooltip,
      KEmptyPlaceholder,
    },
    data: () => ({ currentClassDelete: null }),
    computed: {
      ...mapState('classManagement', ['modalShown', 'classes']),
      noClassesExist() {
        return this.classes.length === 0;
      },
      Modals: () => Modals,
      sortedClassrooms() {
        return orderBy(this.classes, [classroom => classroom.name.toUpperCase()], ['asc']);
      },
    },
    methods: {
      ...mapActions('classManagement', ['displayModal']),
      closeModal() {
        this.displayModal(false);
      },
      // Duplicated in class-list-page
      coachNames(classroom) {
        const { coaches } = classroom;
        return coaches.map(({ full_name }) => full_name);
      },
      formattedCoachNames(classroom) {
        const coach_names = this.coachNames(classroom);
        if (coach_names.length === 1) {
          return coach_names[0];
        }
        if (coach_names.length === 2) {
          return this.$tr('twoCoachNames', {
            name1: coach_names[0],
            name2: coach_names[1],
          });
        }
        return this.$tr('manyCoachNames', {
          name1: coach_names[0],
          name2: coach_names[1],
          numRemaining: coach_names.length - 2,
        });
      },
      formattedCoachNamesTooltip(classroom) {
        const coach_names = this.coachNames(classroom);
        if (coach_names.length > 2) {
          return coach_names.join('\n');
        }
        return null;
      },
      classEditLink,
      openDeleteClassModal(classModel) {
        this.currentClassDelete = classModel;
        this.displayModal(Modals.DELETE_CLASS);
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
      twoCoachNames: '{name1}, {name2}',
      manyCoachNames: '{name1}, {name2}… (+{numRemaining, number})',
      actions: 'Actions',
      noClassesExist: 'No classes exist.',
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

</style>
