<template>

  <div>
    <div>
      <h1>{{ coreString('facilitiesLabel') }}</h1>
      <KButton :text="$tr('syncAllAction')" />
      <KButton :text="$tr('importFacilityAction')" />
    </div>


    <CoreTable>
      <thead slot="thead">
        <tr>
          <th>{{ coreString('facilityLabel') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr>
          <td>
            <div></div>
            <div>
              <KDropdownMenu
                :text="coreString('optionsLabel')"
                :options="options"
              />
              <KButton :text="coreString('syncAction')" />
            </div>
          </td>
        </tr>
      </tbody>
    </CoreTable>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';

  export default {
    name: 'FacilitiesPage',
    components: {
      CoreTable,
    },
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {};
    },
    computed: {
      options() {
        return [
          {
            label: this.coreString('registerAction'),
            value: 'REGISTER',
          },
          {
            label: this.coreString('removeAction'),
            value: 'REMOVE',
          },
        ];
      },
    },
    methods: {},
    $trs: {
      syncAllAction: 'Sync all',
      importFacilityAction: 'Import facility',
    },
  };

</script>


<style lang="scss" scoped></style>
