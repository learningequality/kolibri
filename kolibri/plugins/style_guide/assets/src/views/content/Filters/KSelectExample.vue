<template>

  <div>
    <p>Used as a selector:</p>
    <p>
      <KSelect
        v-model="operatingSystemSelection"
        label="Operating system"
        :options="operatingSystems"
      />
    </p>
    <p>Used as a filter:</p>
    <p>
      <KSelect
        v-model="fruitSelection"
        label="Fruit"
        :options="fruits"
        :inline="true"
      />
    </p>
  </div>

</template>


<script>

  import KSelect from 'kolibri.coreVue.components.KSelect';

  export default {
    name: 'KSelectExample',
    components: { KSelect },
    data: () => ({
      operatingSystemSelection: {},
      fruitSelection: {},
    }),
    computed: {
      operatingSystems() {
        return [
          { label: 'Windows', value: 'Windows', disabled: true },
          { label: 'macOS', value: 'macOS' },
          { label: 'Linux', value: 'Linux' },
        ];
      },
      fruits() {
        return [
          { label: 'All', value: 'All' },
          { label: 'Pomegranate', value: 'Pomegranate' },
          { label: 'Guava', value: 'Guava' },
          { label: 'Tamarind', value: 'Tamarind' },
          { label: 'Jalapeño', value: 'Jalapeño' },
        ];
      },
    },
    beforeMount() {
      this.fruitSelection = this.fruits[0];
    },
  };

</script>
