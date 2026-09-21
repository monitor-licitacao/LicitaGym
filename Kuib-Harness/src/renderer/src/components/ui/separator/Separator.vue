<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
  orientation?: 'horizontal' | 'vertical'
}>()
</script>

<template>
  <div
    role="separator"
    :class="
      cn(
        'shrink-0 bg-border',
        (props.orientation ?? 'horizontal') === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        props.class,
      )
    "
  />
</template>
