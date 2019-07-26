<template>

  <div>
    <p>
      <KFilterTextbox
        v-model="filter"
        placeholder="Filter items"
      />
    </p>
    <ul>
      <li v-for="item in filteredItems" :key="item">
        {{ item }}
      </li>
    </ul>
  </div>

</template>


<script>

  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';

  export default {
    name: 'KFilterTextboxExample',
    components: { KFilterTextbox },
    data: () => ({
      filter: '',
      items: ['chicken', 'ostrich', 'falcon', 'robin', 'eagle'],
    }),
    computed: {
      filteredItems() {
        if (this.filter) {
          return this.items.filter(item => item.includes(this.filter));
        }
        return this.items;
      },
    },
  };

</script>
