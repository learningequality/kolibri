<template>

  <KPageContainer>

    <KGrid>
      <KGridItem
        :layout8="{ span: 6 }"
        :layout12="{ span: 9 }"
      >
        <h1>{{ coreString('classesLabel') }}</h1>
        <p>{{ $tr('adminClassPageSubheader') }}</p>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 2 }"
        :layout12="{ span: 3 }"
      >
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
          <th>{{ coreString('classNameLabel') }}</th>
          <th>{{ coreString('coachesLabel') }}</th>
          <th>{{ coreString('learnersLabel') }}</th>
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

  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import orderBy from 'lodash/orderBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
        title: this.coreString('classesLabel'),
      };
    },
    components: {
      CoreTable,
      ClassCreateModal,
      ClassDeleteModal,
    },
    mixins: [commonCoreStrings],
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
      adminClassPageSubheader: 'View and manage your classes',
      addNew: 'New class',
      deleteClass: 'Delete class',
      tableCaption: 'List of classes',
      twoCoachNames: '{name1}, {name2}',
      manyCoachNames: '{name1}, {name2}… (+{numRemaining, number})',
      actions: 'Actions',
      noClassesExist: 'No classes exist',
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

</style>
