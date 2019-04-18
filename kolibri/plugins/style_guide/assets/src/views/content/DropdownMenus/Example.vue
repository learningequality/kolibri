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
        :primary="true"
      />
    </p>
  </div>

</template>


<script>

  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';

  export default {
    name: 'Example',
    components: { KDropdownMenu },
    data: () => ({
      options: [
        { label: 'fly', value: 'fly' },
        { label: 'walk', value: 'walk' },
        { label: 'chill', value: 'chill' },
      ],
    }),
  };

</script>
