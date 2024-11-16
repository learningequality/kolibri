<template>

  <KModal
    :title="getCommonSyncString('selectFacilityTitle')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="!selectedId"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <slot name="description">
      {{ deviceInfoMsg }}
    </slot>
    <RadioButtonGroup
      :items="facilities"
      :currentValue.sync="selectedId"
      :itemLabel="fac => formatNameAndId(fac.name, fac.id)"
      :itemValue="fac => fac.id"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import RadioButtonGroup from 'kolibri-common/components/syncComponentSet/RadioButtonGroup';

  export default {
    name: 'SelectFacilityModal',
    components: {
      RadioButtonGroup,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      device: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        facilities: [],
        selectedId: '',
      };
    },
    computed: {
      deviceInfoMsg() {
        return this.coreString('commaSeparatedPair', {
          item1: this.formatNameAndId(this.device.name, this.device.id),
          item2: this.device.baseurl,
        });
      },
    },
    beforeMount() {
      this.fetchNetworkLocationFacilities(this.device.id).then(data => {
        this.facilities = [...data.facilities];
      });
    },
    methods: {
      handleSubmit() {
        const selected = this.facilities.find(fac => fac.id === this.selectedId);
        this.$emit('submit', selected);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
