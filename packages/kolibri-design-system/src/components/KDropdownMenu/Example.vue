<template>

  <div>
    <p>
      <KDropdownMenu
        text="Actions"
        :options="options"
      />
    </p>
    <p>
      <KDropdownMenu
        text="Actions"
        :options="options"
        appearance="flat-button"
      />
    </p>
  </div>

</template>


<script>

  import KDropdownMenu from 'kolibri-components/src/KDropdownMenu';

  export default {
    name: 'Example',
    components: { KDropdownMenu },
    data() {
      return {
        options: [
          { label: 'fly', value: 'fly' },
          { label: 'walk', value: 'walk' },
          { label: 'chill', value: 'chill' },
        ],
      };
    },
  };

</script>
