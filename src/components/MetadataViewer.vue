<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: Record<string, unknown> | unknown[] | null | undefined
}>()

const formatted = computed(() => JSON.stringify(props.value ?? {}, null, 2))
</script>

<template>
  <pre class="metadata-json mono">{{ formatted }}</pre>
</template>
