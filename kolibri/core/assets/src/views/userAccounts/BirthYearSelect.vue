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
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { DemographicConstants } from 'kolibri.coreVue.vuex.constants';

  const { NOT_SPECIFIED } = DemographicConstants;

  // Take the last-known year to be the later of the copyright year,
  // or the year of the server date
  const firstYear = Math.max(Number(__copyrightYear), getYear(now()));

  function makeYearOptions(max, min) {
    return range(max, min, -1).map(n => ({
      label: String(n),
      value: String(n),
    }));
  }

  const yearOptions = makeYearOptions(firstYear, 1900);

  export default {
    name: 'BirthYearSelect',
    components: {
      CoreInfoIcon,
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
        // The backend validation actually lets you pick years up to 3000, so we'll
        // fill in the gaps just in case a user was given a later date, e.g. via CSV
        let extraYears = [];
        if (Number(this.value) > firstYear) {
          extraYears = makeYearOptions(Number(this.value), firstYear - 1);
        }
        return [
          {
            value: NOT_SPECIFIED,
            label: this.coreString('notSpecifiedOption'),
          },
          ...extraYears,
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
