<template>

  <FacilityAppBarPage>
    <KPageContainer>
      <p>
        <KRouterLink
          v-if="userIsMultiFacilityAdmin"
          :to="{
            name: facilityPageLinks.AllFacilitiesPage.name,
            params: { subtopicName: 'ManageClassPage' },
          }"
          icon="back"
          :text="coreString('changeLearningFacility')"
        />
      </p>
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

      <KTable
        :headers="tableHeaders"
        :rows="tableRows"
        :caption="$tr('tableCaption')"
        :emptyMessage="$tr('noClassesExist')"
        :dataLoading="dataLoading"
        sortable
      >
        <template #header="{ header, colIndex }">
          <span :class="{ visuallyhidden: colIndex === 3 }">{{ header.label }}</span>
        </template>
        <template #cell="{ content, colIndex, row }">
          <span v-if="colIndex === 0">
            <KRouterLink
              :text="content"
              :to="$store.getters.facilityPageLinks.ClassEditPage(row[3].id)"
              icon="classes"
            />
          </span>
          <span v-else-if="colIndex === 1">
            <KOptionalText :text="coachNames(row[3]).length ? formattedCoachNames(row[3]) : ''" />
            <KTooltip
              v-if="formattedCoachNamesTooltip(row[3])"
              :reference="`coachNames${row[3].id}`"
              :refs="$refs"
            >
              {{ formattedCoachNamesTooltip(row[3]) }}
            </KTooltip>
          </span>
          <span v-else-if="colIndex === 2">
            {{ content }}
          </span>
          <span
            v-else-if="colIndex === 3"
            class="core-table-button-col"
          >
            <KButton
              appearance="flat-button"
              :text="$tr('deleteClass')"
              @click="selectClassToDelete(row[3])"
            />
          </span>
        </template>
      </KTable>

      <ClassDeleteModal
        v-if="Boolean(classToDelete)"
        :classToDelete="classToDelete"
        @cancel="clearClassToDelete"
        @success="handleDeleteSuccess()"
      />
      <ClassCreateModal
        v-if="modalShown === Modals.CREATE_CLASS"
        :classes="classes"
        @cancel="closeModal"
        @success="handleCreateSuccess()"
      />
    </KPageContainer>
  </FacilityAppBarPage>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import { Modals } from '../../constants';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import ClassCreateModal from './ClassCreateModal';
  import ClassDeleteModal from './ClassDeleteModal';
  import useDeleteClass from './useDeleteClass';

  export default {
    name: 'ManageClassPage',
    metaInfo() {
      return {
        title: this.coreString('classesLabel'),
      };
    },
    components: {
      FacilityAppBarPage,
      ClassCreateModal,
      ClassDeleteModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { classToDelete, selectClassToDelete, clearClassToDelete } = useDeleteClass();
      const { userIsMultiFacilityAdmin } = useUser();
      return {
        classToDelete,
        selectClassToDelete,
        clearClassToDelete,
        userIsMultiFacilityAdmin,
      };
    },
    computed: {
      ...mapState('classManagement', ['modalShown', 'classes', 'dataLoading']),
      ...mapGetters(['facilityPageLinks']),

      Modals: () => Modals,
      tableHeaders() {
        return [
          {
            label: this.coreString('classNameLabel'),
            dataType: 'string',
            minWidth: '150px',
            width: '20%',
          },
          {
            label: this.coreString('coachesLabel'),
            dataType: 'undefined',
            minWidth: '150px',
            width: '30%',
          },
          {
            label: this.coreString('learnersLabel'),
            dataType: 'number',
            minWidth: '150px',
            width: '20%',
          },
          {
            label: this.coreString('userActionsColumnHeader'),
            dataType: 'undefined',
            minWidth: '150px',
            width: '30%',
          },
        ];
      },
      tableRows() {
        return this.classes.map(classroom => [
          classroom.name,
          this.formattedCoachNames(classroom),
          this.$formatNumber(classroom.learner_count),
          classroom,
        ]);
      },
    },
    methods: {
      ...mapActions('classManagement', ['displayModal']),
      closeModal() {
        this.displayModal(false);
      },
      handleCreateSuccess() {
        this.closeModal();
        this.refreshCoreFacilities();
      },
      handleDeleteSuccess() {
        this.clearClassToDelete();
        this.refreshCoreFacilities();
      },
      refreshCoreFacilities() {
        if (this.userIsMultiFacilityAdmin) {
          // Update the core facilities object to update classroom number
          this.$store.dispatch('getFacilities');
        }
      },
      // Duplicated in class-list-page
      coachNames(classes) {
        const { coaches } = classes;
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
    },
    $trs: {
      adminClassPageSubheader: {
        message: 'View and manage your classes',
        context: 'Description on Facility > Classes page.',
      },
      addNew: {
        message: 'New class',
        context: 'Button used to create a new class.',
      },
      deleteClass: {
        message: 'Delete class',
        context: 'Option to delete a class.',
      },
      tableCaption: {
        message: 'List of classes',
        context: 'Caption for the table containing the list of classes.',
      },
      twoCoachNames: {
        message: '{name1}, {name2}',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      manyCoachNames: {
        message: '{name1}, {name2}… (+{numRemaining, number})',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      noClassesExist: {
        message: 'No classes exist',
        context:
          'Message that displays when there are no classes created in the Facility > Classes section.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

</style>
