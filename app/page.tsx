'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Info, MapPin, TrendingUp } from 'lucide-react'

type Period = 'pre-covid' | 'covid' | 'post-covid'
type Region = 'Northeast' | 'Midwest' | 'South' | 'West'
type Observation = { date: string; region: Region; unemployment_rate: number; period: Period }

const regions: Region[] = ['Northeast', 'Midwest', 'South', 'West']
const regionColors: Record<Region, string> = {
  Northeast: 'var(--chart-1)',
  Midwest: 'var(--chart-2)',
  South: 'var(--chart-3)',
  West: 'var(--chart-4)',
}
const regionBase: Record<Region, number> = { Northeast: 3.8, Midwest: 4.1, South: 4.5, West: 4.3 }

function createData(): Observation[] {
  const rows: Observation[] = []
  for (let year = 2018; year <= 2023; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const date = `${year}-${String(month).padStart(2, '0')}`
      const period: Period = year < 2020 ? 'pre-covid' : year <= 2021 ? 'covid' : 'post-covid'
      const monthsSinceStart = (year - 2018) * 12 + month - 1
      for (const region of regions) {
        const seasonal = Math.sin((month / 12) * Math.PI * 2) * 0.22
        const trend = Math.max(0, 0.12 - monthsSinceStart * 0.002)
        const spike = year === 2020 ? (month === 4 ? 8.8 : month === 5 ? 7.1 : month === 6 ? 5.7 : 1.5) : year === 2021 ? 1.1 - month * 0.035 : 0
        const recovery = year >= 2022 ? -0.12 - (year - 2022) * 0.12 : 0
        const rate = Math.max(2.5, regionBase[region] + seasonal + trend + spike + recovery)
        rows.push({ date, region, unemployment_rate: Number(rate.toFixed(1)), period })
      }
    }
  }
  return rows
}

const data = createData()
const formatRate = (value: number) => `${value.toFixed(1)}%`
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

function MetricCard({ label, value, detail, icon: Icon, trend }: { label: string; value: string; detail: string; icon: typeof Activity; trend?: 'up' | 'down' }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-5" /></div>
        {trend && <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">{trend === 'down' ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />} from prior period</span>}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-xl"><p className="mb-1 font-semibold text-popover-foreground">{label}</p>{payload.map((item) => <p className="flex items-center justify-between gap-5 text-muted-foreground" key={item.name}><span>{item.name}</span><span className="font-medium text-popover-foreground">{formatRate(item.value)}</span></p>)}</div>
}

export default function Page() {
  const [view, setView] = useState<'all' | 'single'>('all')
  const [selectedRegion, setSelectedRegion] = useState<Region>('Northeast')
  const currentMonth = data.filter((item) => item.date === '2023-12')
  const metrics = useMemo(() => {
    const current = average(currentMonth.map((item) => item.unemployment_rate))
    const covid = data.filter((item) => item.period === 'covid')
    const peak = Math.max(...covid.map((item) => item.unemployment_rate))
    const yoy = current - average(data.filter((item) => item.date === '2022-12').map((item) => item.unemployment_rate))
    const pre = average(data.filter((item) => item.period === 'pre-covid').map((item) => item.unemployment_rate))
    const post = average(data.filter((item) => item.period === 'post-covid').map((item) => item.unemployment_rate))
    return { current, peak, yoy, pre, post }
  }, [currentMonth])
  const timeline = useMemo(() => {
    const source = view === 'single' ? data.filter((item) => item.region === selectedRegion) : data
    return Array.from(new Set(source.map((item) => item.date))).map((date) => {
      const row: Record<string, string | number> = { date }
      for (const region of regions) {
        const match = source.find((item) => item.date === date && item.region === region)
        if (match) row[region] = match.unemployment_rate
      }
      return row
    })
  }, [view, selectedRegion])
  const regionalAverages = regions.map((region) => ({ region, rate: Number(average(data.filter((item) => item.region === region).map((item) => item.unemployment_rate)).toFixed(1)) }))
  const visibleRegions = view === 'single' ? [selectedRegion] : regions

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><Activity className="size-4" /> Labor market monitor</div><h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Unemployment Trend Analysis</h1><p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">A monthly view of unemployment across U.S. regions, highlighting the labor market shock and recovery surrounding COVID-19.</p></div>
          <div className="flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:self-auto"><CalendarDays className="size-4" /> Jan 2018 — Dec 2023</div>
        </header>

        <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Current unemployment" value={formatRate(metrics.current)} detail="December 2023 average across regions" icon={Activity} trend="down" />
          <MetricCard label="Peak rate" value={formatRate(metrics.peak)} detail="April 2020, at the height of COVID" icon={TrendingUp} />
          <MetricCard label="Year-over-year change" value={`${metrics.yoy > 0 ? '+' : ''}${metrics.yoy.toFixed(1)} pts`} detail="December 2023 vs December 2022" icon={ArrowDownRight} trend={metrics.yoy < 0 ? 'down' : 'up'} />
          <MetricCard label="Pre vs post COVID" value={`${metrics.pre.toFixed(1)}% → ${metrics.post.toFixed(1)}%`} detail="Average rate across each period" icon={MapPin} />
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">Unemployment rate over time</h2><p className="mt-1 text-sm text-muted-foreground">Monthly seasonally adjusted estimate by region</p></div><div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chart region filter"><div className="flex rounded-lg border border-border bg-muted p-1"><button onClick={() => setView('all')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>All regions</button><button onClick={() => setView('single')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'single' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Single region</button></div>{view === 'single' && <select aria-label="Select region" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value as Region)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring">{regions.map((region) => <option key={region}>{region}</option>)}</select>}</div></div>
          <div className="mt-6 h-[330px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" /><ReferenceArea x1="2020-01" x2="2021-12" fill="var(--chart-3)" fillOpacity={0.08} label={{ value: 'COVID period', position: 'insideTopLeft', fill: 'var(--muted-foreground)', fontSize: 11 }} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(value) => value.endsWith('-01') ? value.slice(0, 4) : ''} minTickGap={32} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(value) => `${value}%`} domain={[0, 14]} /><Tooltip content={<ChartTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 14 }} />{visibleRegions.map((region) => <Line key={region} type="monotone" dataKey={region} name={region} stroke={regionColors[region]} strokeWidth={view === 'single' ? 3 : 2} dot={false} activeDot={{ r: 4 }} />)}</LineChart></ResponsiveContainer></div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)] sm:p-6"><div><h2 className="font-semibold">Regional comparison</h2><p className="mt-1 text-sm text-muted-foreground">Average unemployment rate, 2018–2023</p></div><div className="mt-6 h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={regionalAverages} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}><CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" /><XAxis type="number" domain={[0, 7]} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(value) => `${value}%`} /><YAxis dataKey="region" type="category" width={72} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="rate" name="Average rate" fill="var(--chart-2)" radius={[0, 5, 5, 0]} barSize={24} /></BarChart></ResponsiveContainer></div></section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)] sm:p-6"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Info className="size-4" /></div><div><h2 className="font-semibold">Key takeaways</h2><p className="mt-1 text-sm text-muted-foreground">What the data tells us</p></div></div><ul className="mt-5 flex flex-col gap-4 text-sm leading-6 text-muted-foreground"><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />Unemployment reached an estimated {formatRate(metrics.peak)} in April 2020, the sharpest labor-market disruption in the series.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />The West and South carry the highest six-year averages, at {formatRate(regionalAverages.find((item) => item.region === 'West')?.rate ?? 0)} and {formatRate(regionalAverages.find((item) => item.region === 'South')?.rate ?? 0)}.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />Rates normalized through 2021, with the recovery continuing steadily into 2022.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />The December 2023 average is {formatRate(Math.abs(metrics.yoy))} point{Math.abs(metrics.yoy) === 1 ? '' : 's'} lower than the same month last year.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />Pre-COVID unemployment averaged {formatRate(metrics.pre)}; post-COVID levels settled near {formatRate(metrics.post)}.</li></ul></section>
        </div>
        <footer className="flex items-center justify-between border-t border-border/70 pt-5 text-xs text-muted-foreground"><span>Source: modeled monthly estimates for demonstration</span><span>Updated December 2023</span></footer>
      </div>
    </main>
  )
}
