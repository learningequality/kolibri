<template>

  <HeaderTable
    v-if="content"
    class="license-detail-style"
  >
    <HeaderTableRow
      v-if="content.duration"
      :keyText="coreString('suggestedTime')"
    >
      <template #value>
        {{ content.duration ? getTime(content.duration) : notAvailableLabel$() }}
      </template>
    </HeaderTableRow>

    <HeaderTableRow
      v-if="licenseName"
      :keyText="licenseDataHeader$()"
    >
      <template #value>
        {{ licenseName }}
      </template>
    </HeaderTableRow>

    <HeaderTableRow
      v-if="content.license_owner"
      :keyText="copyrightHolderDataHeader$()"
    >
      <template #value>
        {{ content.license_owner }}
      </template>
    </HeaderTableRow>
  </HeaderTable>

</template>


<script>

  import { computed, toRefs } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { licenseLongName } from 'kolibri/uiText/licenses';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import HeaderTable from '../../../HeaderTable/index.vue';
  import HeaderTableRow from '../../../HeaderTable/HeaderTableRow.vue';

  export default {
    name: 'PreviewMetadata',
    components: {
      HeaderTable,
      HeaderTableRow,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const { contentNode } = toRefs(props);

      const { copyrightHolderDataHeader$, licenseDataHeader$, notAvailableLabel$, minutes$ } =
        searchAndFilterStrings;

      function getTime(seconds) {
        return minutes$({ value: Math.floor(seconds / 60) });
      }

      const licenseName = computed(() => {
        return licenseLongName(contentNode.value.license_name);
      });

      return {
        content: contentNode,
        licenseName,
        licenseDataHeader$,
        copyrightHolderDataHeader$,
        notAvailableLabel$,
        getTime,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .license-detail-style {
    margin-top: 1.5em;
  }

</style>
