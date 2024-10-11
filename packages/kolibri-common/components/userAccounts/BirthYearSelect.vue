<template>

  <div class="pos-rel">
    <KSelect
      class="birthyear-select"
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
      :tooltipPlacement="tooltipPlacement"
      :iconAriaLabel="$tr('birthyearAriaLabel')"
    />
  </div>

</template>


<script>

  import range from 'lodash/range';
  import getYear from 'date-fns/get_year';
  import { now } from 'kolibri/utils/serverClock';
  import CoreInfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { DemographicConstants } from 'kolibri/constants';

  const { NOT_SPECIFIED } = DemographicConstants;

  // Take the last-known year to be the later of the copyright year,
  // or the year of the server date
  const firstYear = Math.max(Number(__copyrightYear), getYear(now()));

  export default {
    name: 'BirthYearSelect',
    components: {
      CoreInfoIcon,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      value: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        yearOptions: this.makeYearOptions(firstYear, 1900),
      };
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
          extraYears = this.makeYearOptions(Number(this.value), firstYear - 1);
        }
        return [
          {
            value: NOT_SPECIFIED,
            label: this.coreString('birthYearNotSpecified'),
          },
          ...extraYears,
          ...this.yearOptions,
        ];
      },
      tooltipPlacement() {
        if (this.windowIsSmall) {
          return 'left';
        }
        return 'bottom';
      },
    },
    methods: {
      makeYearOptions(max, min) {
        return range(max, min, -1).map(n => {
          // Because of timezone, year could be mismatched when localized in any
          // timezone that less than UTC. for ex- 2022 will be shown instead of 2023
          const date = new Date();
          date.setFullYear(n);
          return {
            label: this.$formatDate(String(date), { year: 'numeric' }),
            value: String(n),
          };
        });
      },
    },
    $trs: {
      placeholder: {
        message: 'Select year',
        context:
          "When you edit or create a user you can optionally add the year they were born. You use the 'Select year' drop-down menu to do this. This is located under the 'Birth year' title.",
      },
      birthYearTooltip: {
        message: 'Provide an estimate if you are unsure.',
        context:
          "This is a helper text that appears when you select the 'i' icon next to the 'Birth year' field when creating or editing a user.\n\nIt asks the user to provide an estimate of the birth year of a user if the age of the user is unknown.",
      },
      birthyearAriaLabel: {
        message: 'About providing your birth year.',
        context:
          "Could also be translated as \"View information about providing your birth year\"\n\nAll 'AriaLabel' type of messages are providing additional context to the screen-reader users. \n\nIn this case the screen-reader will announce the message to indicate that the 'i' icon for the 'Birth year' field offers suggestions how to include that information when creating the user.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .pos-rel {
    position: relative;
  }

  .birthyear-select {
    width: calc(100% - 32px);
  }

  .info-icon {
    position: absolute;
    top: 27px;
    right: 0;
  }

</style>
