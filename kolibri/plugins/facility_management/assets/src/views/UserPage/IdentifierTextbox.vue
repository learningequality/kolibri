<template>

  <div class="pos-rel">
    <KTextbox
      :value="value"
      :label="$tr('label')"
      :maxlength="64"
      v-bind="$attrs"
      @input="$emit('update:value', $event)"
    />
    <CoreInfoIcon
      class="info-icon"
      :tooltipText="$tr('identifierTooltip')"
      :iconAriaLabel="$tr('identifierAriaLabel')"
    />
  </div>

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';

  export default {
    name: 'IdentifierTextbox',
    components: {
      CoreInfoIcon,
      KTextbox,
    },
    props: {
      value: {
        type: String,
      },
    },
    $trs: {
      label: 'Identifier (Optional)',
      identifierTooltip:
        'This could be a student ID number or an existing user identification number outside of Kolibri, for example.',
      identifierAriaLabel: 'About providing an identifier or ID number',
    },
  };

</script>


<style lang="scss" scoped>

  // Copied from BirthYearSelect
  .pos-rel {
    position: relative;
  }

  .info-icon {
    position: absolute;
    top: 27px;
    right: -34px;
  }

</style>
