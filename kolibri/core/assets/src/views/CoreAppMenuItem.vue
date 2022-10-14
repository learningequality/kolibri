<template>

  <li>
    <a
      :href="link"
      class="core-menu-option"
      role="menuitem"
      :class="$computedClass(optionStyle)"
      :tabindex="link ? false : '0'"
      @click="conditionalEmit"
      @keydown.enter="conditionalEmit"
    >
      <slot>
        <KLabeledIcon>
          <template v-if="icon" #icon>
            <KIcon
              :icon="icon"
              :color="optionIconColor"
            />
          </template>
          <div v-if="label">{{ label }}</div>
        </KLabeledIcon>
        <div
          v-if="secondaryText"
        >{{ secondaryText }}</div>
      </slot>
    </a>
  </li>

</template>
