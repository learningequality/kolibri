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

      <CoreTable
        :dataLoading="dataLoading"
        :emptyMessage="$tr('noClassesExist')"
      >
        <caption class="visuallyhidden">
          {{
            $tr('tableCaption')
          }}
        </caption>
        <template #headers>
          <th>{{ coreString('classNameLabel') }}</th>
          <th>{{ coreString('coachesLabel') }}</th>
          <th>{{ coreString('learnersLabel') }}</th>
          <th>
            <span class="visuallyhidden">
              {{ coreString('userActionsColumnHeader') }}
            </span>
          </th>
        </template>
        <template #tbody>
          <transition-group
            tag="tbody"
            name="list"
          >
            <tr
              v-for="classroom in sortedClassrooms"
              :key="classroom.id"
            >
              <td>
                <KRouterLink
                  :text="classroom.name"
                  :to="$store.getters.facilityPageLinks.ClassEditPage(classroom.id)"
                  icon="classes"
                />
              </td>
              <td>
                <span :ref="`coachNames${classroom.id}`">
                  <KOptionalText
                    :text="coachNames(classroom).length ? formattedCoachNames(classroom) : ''"
                  />
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
                {{ $formatNumber(classroom.learner_count) }}
              </td>
              <td class="core-table-button-col">
                <KButton
                  appearance="flat-button"
                  :text="$tr('deleteClass')"
                  @click="selectClassToDelete(classroom)"
                />
              </td>
            </tr>
          </transition-group>
        </template>
      </CoreTable>

      <ClassDeleteModal
        v-if="Boolean(classToDelete)"
        :classToDelete="classToDelete"
        @cancel="clearClassToDelete"
        @success="handleDeleteSuccess()"
      />
      <ClassCreateModal
        v-if="modalShown === Modals.CREATE_CLASS"
        :classes="sortedClassrooms"
        @cancel="closeModal"
        @success="handleCreateSuccess()"
      />
    </KPageContainer>
  </FacilityAppBarPage>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import orderBy from 'lodash/orderBy';
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
      CoreTable,
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
      sortedClassrooms() {
        return orderBy(this.classes, [classroom => classroom.name.toUpperCase()], ['asc']);
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
