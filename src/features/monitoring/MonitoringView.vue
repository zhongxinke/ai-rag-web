<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Activity, BarChart3, RefreshCw, Server, ShieldCheck } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'

import { monitoringApi } from '@/api/monitoringApi'
import type { ActuatorHealth, ActuatorMetric } from '@/api/types'
import PageHeader from '@/components/PageHeader.vue'
import PermissionState from '@/components/PermissionState.vue'
import { isAppError, resolveErrorMessage } from '@/utils/error'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '同源 / Vite 代理'
const proxyTarget = import.meta.env.API_PROXY_TARGET || '由 Vite dev server 注入'

const loading = ref(false)
const metricLoading = ref(false)
const health = ref<ActuatorHealth | null>(null)
const info = ref<Record<string, unknown> | null>(null)
const metricNames = ref<string[]>([])
const metricQuery = ref('')
const selectedMetricName = ref('')
const selectedMetric = ref<ActuatorMetric | null>(null)
const loadError = ref<unknown>(null)
const partialWarnings = ref<string[]>([])

const healthType = computed(() => {
  const status = health.value?.status
  if (status === 'UP') {
    return 'success'
  }
  if (status === 'DOWN' || status === 'OUT_OF_SERVICE') {
    return 'danger'
  }
  return 'warning'
})

const healthLabel = computed(() => health.value?.status || 'UNKNOWN')

const componentRows = computed(() => {
  const components = health.value?.components || {}
  return Object.entries(components).map(([name, component]) => ({
    name,
    status: component.status || 'UNKNOWN',
    details: component.details || {},
  }))
})

const infoRows = computed(() => {
  if (!info.value) {
    return []
  }

  return Object.entries(info.value).map(([key, value]) => ({
    key,
    value: formatValue(value),
  }))
})

const filteredMetricNames = computed(() => {
  const query = metricQuery.value.trim().toLowerCase()
  if (!query) {
    return metricNames.value.slice(0, 80)
  }

  return metricNames.value.filter((name) => name.toLowerCase().includes(query)).slice(0, 80)
})

const permissionError = computed(() => {
  if (!isAppError(loadError.value)) {
    return null
  }

  const code = loadError.value.code
  if (loadError.value.status === 401 || loadError.value.status === 403 || code === 'AUTH_REQUIRED' || code === 'FORBIDDEN') {
    return loadError.value
  }

  return null
})

const metricsSummary = computed(() => [
  {
    label: '健康状态',
    value: healthLabel.value,
    icon: ShieldCheck,
  },
  {
    label: '指标数量',
    value: String(metricNames.value.length),
    icon: BarChart3,
  },
  {
    label: '后端地址',
    value: apiBaseUrl,
    icon: Server,
  },
])

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value, null, 2)
}

function isPermissionError(error: unknown) {
  return (
    isAppError(error) &&
    (error.status === 401 || error.status === 403 || error.code === 'AUTH_REQUIRED' || error.code === 'FORBIDDEN')
  )
}

async function loadSelectedMetric(name: string) {
  if (!name) {
    selectedMetric.value = null
    return
  }

  metricLoading.value = true
  selectedMetricName.value = name

  try {
    selectedMetric.value = await monitoringApi.metric(name)
  } catch (error) {
    selectedMetric.value = null
    partialWarnings.value = Array.from(new Set([...partialWarnings.value, resolveErrorMessage(error)]))
  } finally {
    metricLoading.value = false
  }
}

async function loadMonitoring() {
  loading.value = true
  loadError.value = null
  partialWarnings.value = []

  const [healthResult, infoResult, metricsResult] = await Promise.allSettled([
    monitoringApi.health(),
    monitoringApi.info(),
    monitoringApi.metrics(),
  ])

  if (healthResult.status === 'fulfilled') {
    health.value = healthResult.value
  } else {
    health.value = null
    partialWarnings.value.push(resolveErrorMessage(healthResult.reason))
  }

  if (infoResult.status === 'fulfilled') {
    info.value = infoResult.value
  } else {
    info.value = null
    partialWarnings.value.push(resolveErrorMessage(infoResult.reason))
  }

  if (metricsResult.status === 'fulfilled') {
    metricNames.value = [...metricsResult.value.names].sort()
  } else {
    metricNames.value = []
    partialWarnings.value.push(resolveErrorMessage(metricsResult.reason))
  }

  const rejected = [healthResult, infoResult, metricsResult].filter((result) => result.status === 'rejected')
  const allRejected = rejected.length === 3
  const firstReason = rejected[0]?.status === 'rejected' ? rejected[0].reason : null

  if (allRejected || isPermissionError(firstReason)) {
    loadError.value = firstReason
  }

  if (metricNames.value.length) {
    const preferred = ['http.server.requests', 'jvm.memory.used', 'process.uptime'].find((name) =>
      metricNames.value.includes(name),
    )
    await loadSelectedMetric(selectedMetricName.value || preferred || metricNames.value[0])
  } else {
    selectedMetricName.value = ''
    selectedMetric.value = null
  }

  partialWarnings.value = Array.from(new Set(partialWarnings.value))
  loading.value = false
}

async function refresh() {
  await loadMonitoring()
  if (!loadError.value) {
    ElMessage.success('监控状态已刷新')
  }
}

onMounted(loadMonitoring)
</script>

<template>
  <section>
    <PageHeader title="运行监控" description="查看后端健康状态、Actuator 信息和运行指标，辅助生产部署后的基础排障。">
      <template #actions>
        <el-button type="primary" :loading="loading" @click="refresh">
          <RefreshCw :size="16" />
          刷新
        </el-button>
      </template>
    </PageHeader>

    <PermissionState
      v-if="permissionError"
      title="监控端点需要权限"
      :description="resolveErrorMessage(permissionError)"
    />

    <template v-else>
      <el-alert
        v-if="loadError"
        class="monitoring-alert"
        type="error"
        :closable="false"
        :title="resolveErrorMessage(loadError)"
      />
      <el-alert
        v-else-if="partialWarnings.length"
        class="monitoring-alert"
        type="warning"
        :closable="false"
        title="部分监控端点不可用"
        :description="partialWarnings.join('；')"
      />

      <div class="monitoring-grid">
        <article v-for="item in metricsSummary" :key="item.label" class="monitoring-stat">
          <div class="monitoring-stat__icon">
            <component :is="item.icon" :size="20" />
          </div>
          <div class="monitoring-stat__copy">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </article>
      </div>

      <div class="monitoring-layout">
        <section class="page-band">
          <div class="page-band__header">
            <div>
              <h2>健康检查</h2>
              <p>来自 `/actuator/health`。</p>
            </div>
            <el-tag :type="healthType" effect="light">{{ healthLabel }}</el-tag>
          </div>
          <div class="page-band__body">
            <el-skeleton v-if="loading && !health" :rows="4" animated />
            <template v-else>
              <el-table v-if="componentRows.length" :data="componentRows" stripe>
                <el-table-column prop="name" label="组件" min-width="140" />
                <el-table-column prop="status" label="状态" width="120">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'UP' ? 'success' : 'warning'" effect="light">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="详情" min-width="220">
                  <template #default="{ row }">
                    <pre class="monitoring-json">{{ formatValue(row.details) }}</pre>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无健康组件明细" />
            </template>
          </div>
        </section>

        <section class="page-band">
          <div class="page-band__header">
            <div>
              <h2>运行信息</h2>
              <p>生产构建和服务元数据。</p>
            </div>
          </div>
          <div class="page-band__body">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="API Base URL">{{ apiBaseUrl }}</el-descriptions-item>
              <el-descriptions-item label="开发代理">{{ proxyTarget }}</el-descriptions-item>
              <el-descriptions-item v-for="row in infoRows" :key="row.key" :label="row.key">
                <pre class="monitoring-json monitoring-json--inline">{{ row.value }}</pre>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </section>
      </div>

      <section class="page-band monitoring-metrics">
        <div class="page-band__header">
          <div>
            <h2>运行指标</h2>
            <p>选择 Actuator metric 查看当前测量值和可用标签。</p>
          </div>
          <el-input v-model="metricQuery" class="monitoring-search" placeholder="筛选指标" clearable />
        </div>
        <div class="page-band__body monitoring-metrics__body">
          <aside class="metric-list" aria-label="指标列表">
            <button
              v-for="name in filteredMetricNames"
              :key="name"
              class="metric-list__item"
              :class="{ active: selectedMetricName === name }"
              type="button"
              @click="loadSelectedMetric(name)"
            >
              {{ name }}
            </button>
            <el-empty v-if="!filteredMetricNames.length" description="暂无指标" />
          </aside>

          <div class="metric-detail">
            <el-skeleton v-if="metricLoading" :rows="6" animated />
            <template v-else-if="selectedMetric">
              <div class="metric-detail__header">
                <Activity :size="18" />
                <div>
                  <h3>{{ selectedMetric.name }}</h3>
                  <p>{{ selectedMetric.description || '暂无描述' }}</p>
                </div>
              </div>
              <el-table :data="selectedMetric.measurements" stripe>
                <el-table-column prop="statistic" label="统计项" min-width="140" />
                <el-table-column label="值" min-width="160">
                  <template #default="{ row }">
                    {{ row.value }}{{ selectedMetric?.baseUnit ? ` ${selectedMetric.baseUnit}` : '' }}
                  </template>
                </el-table-column>
              </el-table>

              <div v-if="selectedMetric.availableTags.length" class="metric-tags">
                <div v-for="tag in selectedMetric.availableTags" :key="tag.tag" class="metric-tags__group">
                  <span>{{ tag.tag }}</span>
                  <el-tag v-for="value in tag.values.slice(0, 12)" :key="value" effect="plain">{{ value }}</el-tag>
                </div>
              </div>
            </template>
            <el-empty v-else description="选择一个指标查看详情" />
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.monitoring-alert {
  margin-bottom: 18px;
}

.monitoring-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.monitoring-stat {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  padding: 16px;
  box-shadow: var(--app-shadow-sm);
}

.monitoring-stat__icon {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-radius);
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.monitoring-stat__copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.monitoring-stat__copy span {
  color: var(--app-text-subtle);
  font-size: 12px;
  font-weight: 800;
}

.monitoring-stat__copy strong {
  overflow: hidden;
  color: var(--app-text);
  font-size: 16px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitoring-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
  gap: 18px;
  margin-bottom: 18px;
}

h2,
h3,
p {
  margin: 0;
}

h2 {
  color: var(--app-text);
  font-size: 16px;
  font-weight: 800;
}

h3 {
  color: var(--app-text);
  font-size: 15px;
  font-weight: 800;
}

.page-band__header p,
.metric-detail__header p {
  margin-top: 4px;
  color: var(--app-text-muted);
  line-height: 1.5;
}

.monitoring-json {
  max-height: 120px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.monitoring-json--inline {
  max-height: 180px;
}

.monitoring-search {
  width: min(280px, 100%);
}

.monitoring-metrics__body {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 18px;
}

.metric-list {
  display: grid;
  max-height: 520px;
  align-content: flex-start;
  gap: 6px;
  overflow: auto;
  border-right: 1px solid var(--app-border);
  padding-right: 14px;
}

.metric-list__item {
  min-height: 34px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--app-radius-sm);
  background: transparent;
  color: var(--app-text-muted);
  padding: 0 10px;
  text-align: left;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.metric-list__item:hover,
.metric-list__item.active {
  border-color: #bfdbfe;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.metric-detail {
  min-width: 0;
}

.metric-detail__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.metric-tags {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.metric-tags__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.metric-tags__group > span {
  color: var(--app-text);
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 980px) {
  .monitoring-grid,
  .monitoring-layout,
  .monitoring-metrics__body {
    grid-template-columns: 1fr;
  }

  .metric-list {
    max-height: 240px;
    border-right: 0;
    border-bottom: 1px solid var(--app-border);
    padding-right: 0;
    padding-bottom: 14px;
  }
}
</style>
