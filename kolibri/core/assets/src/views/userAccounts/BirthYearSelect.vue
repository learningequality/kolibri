<template>

  <div class="pos-rel">
    <KSelect
      class="select"
      :value="selected"
      :label="coreString('birthYearLabel')"
      :placeholder="$tr('placeholder')"
      :options="options"
      :disabled="$attrs.disabled"
      @change="$emit('update:value', $event.value)"
    />
    <CoreInfoIcon
      class="info-icon"
      :tooltipText="$tr('birthYearTooltip')"
      :iconAriaLabel="$tr('birthyearAriaLabel')"
    />

  </div>

</template>


<script>

  import range from 'lodash/range';
  import getYear from 'date-fns/get_year';
  import { now } from 'kolibri.utils.serverClock';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  // Take the last-known year to be the later of the copyright year,
  // or the year of the server date
  const firstYear = Math.max(Number(__copyrightYear), getYear(now()));

  const yearOptions = range(firstYear, 1900, -1).map(n => ({
    label: String(n),
    value: String(n),
  }));

  export default {
    name: 'BirthYearSelect',
    components: {
      CoreInfoIcon,
      KSelect,
    },
    mixins: [commonCoreStrings],
    props: {
      value: {
        type: String,
      },
    },
    computed: {
      selected() {
        return this.options.find(o => o.value === this.value) || {};
      },
      options() {
        return [
          {
            value: 'DECLINE',
            label: this.coreString('notSpecifiedOption'),
          },
          ...yearOptions,
        ];
      },
    },
    $trs: {
      placeholder: 'Select year',
      birthYearTooltip: 'Provide an estimate if you are unsure.',
      birthyearAriaLabel: 'About providing your birth year.',
    },
  };

</script>


<style lang="scss" scoped>

  .pos-rel {
    position: relative;
  }

  .info-icon {
    position: absolute;
    top: 27px;
    right: -34px;
  }

</style>
