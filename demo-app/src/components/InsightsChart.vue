<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import { useChartData } from '@/composables/useChartData'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Filler,
  Legend,
)

const { chartData, chartOptions, chartType, hasData } = useChartData()

// Type assertions for component props
const barChartData = computed(() => chartData.value as ChartData<'bar'>)
const barChartOptions = computed(() => chartOptions.value as ChartOptions<'bar'>)
const lineChartData = computed(() => chartData.value as ChartData<'line'>)
const lineChartOptions = computed(() => chartOptions.value as ChartOptions<'line'>)
</script>

<template>
  <section class="chart-card glass-panel">
    <header class="chart-header">
      <div>
        <p class="eyebrow">Engagement trend</p>
        <strong>Weekly Impact</strong>
      </div>
      <span class="pill pill-positive">+18.4%</span>
    </header>
    <div v-if="hasData" class="chart-wrapper">
      <Bar v-if="chartType === 'bar'" :data="barChartData" :options="barChartOptions" />
      <Line v-else :data="lineChartData" :options="lineChartOptions" />
    </div>
    <p v-else class="chart-placeholder">
      Waiting for Insights data. Ask CXone to either send a `chartConfig` object together with
      <code>createChart: true</code>, or provide the `hasTableData` payload and a follow-up message with
      <code>createChart: true</code>.
    </p>
  </section>
</template>

<style scoped>
.chart-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  min-height: 250px;
  border: 1px solid #d1d1d1;
  background: #fff;
}

.chart-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 12px;
}

.chart-header strong {
  font-size: 14px;
  font-weight: 600;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
}

.pill-positive {
  color: #1a7f37;
  background: #dafbe1;
  border: 1px solid #1a7f37;
}

.chart-wrapper {
  flex: 1;
  min-height: 180px;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-placeholder {
  margin: 0;
  color: #666;
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
}
</style>
