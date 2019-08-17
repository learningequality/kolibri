<template>

  <div>
    <p>Group 1:</p>
    <KRadioButton
      v-model="group1"
      label="Radio 1"
      :value="1"
    />
    <KRadioButton
      v-model="group1"
      label="Radio 2"
      :value="2"
    />
    <KRadioButton
      v-model="group1"
      label="Radio 3"
      :value="3"
    />
    <p>Group 2:</p>
    <KRadioButton
      v-model="group2"
      label="Radio 4 Disabled"
      :value="4"
      :disabled="true"
    />
    <KRadioButton
      v-model="group2"
      label="Radio 5 Disabled"
      :value="5"
      :disabled="true"
    />
  </div>

</template>


<script>

  import KRadioButton from 'kolibri-components/src/KRadioButton';

  export default {
    name: 'Example',
    components: { KRadioButton },
    data: () => ({
      group1: 2,
      group2: 4,
    }),
  };

</script>
