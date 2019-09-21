<template>

  <div>
    <KCheckbox
      label="Unchecked"
    />
    <KCheckbox
      label="Indeterminate"
      :indeterminate="true"
    />
    <KCheckbox
      label="Checked"
      :checked="true"
    />
    <KCheckbox
      label="Disabled Unchecked"
      :disabled="true"
    />
    <KCheckbox
      label="Disabled Indeterminate"
      :indeterminate="true"
      :disabled="true"
    />
    <KCheckbox
      label="Disabled Checked"
      :checked="true"
      :disabled="true"
    />
  </div>

</template>


<script>

  import KCheckbox from 'kolibri-components/src/KCheckbox';

  export default {
    name: 'Example',
    components: { KCheckbox },
  };

</script>
