import { request } from '@/api/client'
import type { ActuatorHealth, ActuatorMetric, ActuatorMetricsIndex } from '@/api/types'

export const monitoringApi = {
  health() {
    return request<ActuatorHealth>({
      method: 'GET',
      url: '/actuator/health',
      timeout: 10000,
    })
  },

  info() {
    return request<Record<string, unknown>>({
      method: 'GET',
      url: '/actuator/info',
      timeout: 10000,
    })
  },

  metrics() {
    return request<ActuatorMetricsIndex>({
      method: 'GET',
      url: '/actuator/metrics',
      timeout: 10000,
    })
  },

  metric(name: string) {
    return request<ActuatorMetric>({
      method: 'GET',
      url: `/actuator/metrics/${encodeURIComponent(name)}`,
      timeout: 10000,
    })
  },
}
