'use client'

import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Info, MapPin, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Period = 'pre-covid' | 'covid' | 'post-covid'
type Region = 'North' | 'South' | 'East' | 'West' | 'Northeast'
type Observation = { date: string; region: Region; unemployment_rate: number; period: Period }
type CsvRow = Record<string, string>

const DATA_URL = 'https://raw.githubusercontent.com/amankharwal/Website-data/master/unemployment.csv'
const regions: Region[] = ['North', 'South', 'East', 'West', 'Northeast']
const regionColors: Record<Region, string> = { North: 'var(--chart-1)', South: 'var(--chart-2)', East: 'var(--chart-3)', West: 'var(--chart-4)', Northeast: 'var(--chart-5)' }
const formatRate = (value: number) => `${value.toFixed(1)}%`
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

function parseDate(value: string) {
  const [day, month, year] = value.trim().split('-')
  return year && month ? `${year}-${month}` : ''
}

function periodFor(date: string): Period {
  if (date <= '2020-03') return 'pre-covid'
  if (date <= '2020-06') return 'covid'
  return 'post-covid'
}

function parseRows(rows: CsvRow[]): Observation[] {
  return rows.flatMap((row) => {
    const date = parseDate(row.Date ?? '')
    const region = (row.Region_1 ?? row.Zone ?? '').trim() as Region
    const rate = Number((row['Estimated Unemployment Rate (%)'] ?? '').trim())
    if (!date || !regions.includes(region) || !Number.isFinite(rate)) return []
    return [{ date, region, unemployment_rate: rate, period: periodFor(date) }]
  }).sort((a, b) => a.date.localeCompare(b.date))
}

function MetricCard({ label, value, detail, icon: Icon, trend }: { label: string; value: string; detail: string; icon: typeof Activity; trend?: 'up' | 'down' }) {
  return <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)]"><div className="flex items-start justify-between gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-5" /></div>{trend && <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">{trend === 'down' ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />} from prior period</span>}</div><p className="mt-5 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-xl"><p className="mb-1 font-semibold text-popover-foreground">{label}</p>{payload.map((item) => <p className="flex items-center justify-between gap-5 text-muted-foreground" key={item.name}><span>{item.name}</span><span className="font-medium text-popover-foreground">{formatRate(item.value)}</span></p>)}</div>
}

function LoadingDashboard() {
  return <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-8"><div className="flex flex-col gap-3 border-b border-border/70 pb-7"><div className="h-4 w-36 animate-pulse rounded bg-muted" /><div className="h-10 w-3/4 animate-pulse rounded bg-muted" /><div className="h-5 w-full max-w-2xl animate-pulse rounded bg-muted" /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div className="h-36 animate-pulse rounded-2xl bg-muted" key={item} />)}</div><div className="h-[390px] animate-pulse rounded-2xl bg-muted" /><div className="h-72 animate-pulse rounded-2xl bg-muted" /></div></main>
}

export default function Page() {
  const [data, setData] = useState<Observation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'all' | 'single'>('all')
  const [selectedRegion, setSelectedRegion] = useState<Region>('North')

  useEffect(() => {
    const controller = new AbortController()
    fetch(DATA_URL, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Unable to fetch the public dataset.'); return response.text() }).then((csv) => {
      const result = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim() })
      const parsed = parseRows(result.data)
      if (!parsed.length) throw new Error('The dataset did not contain usable zone-level observations.')
      setData(parsed)
    }).catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === 'AbortError') return; setError(reason instanceof Error ? reason.message : 'Something went wrong while loading the data.') })
    return () => controller.abort()
  }, [])

  const metrics = useMemo(() => {
    if (!data.length) return { current: 0, peak: 0, yoy: 0, pre: 0, post: 0, latest: '' }
    const dates = [...new Set(data.map((item) => item.date))].sort()
    const latest = dates.at(-1) ?? ''
    const previous = dates.at(-13) ?? dates.at(-2) ?? ''
    const current = average(data.filter((item) => item.date === latest).map((item) => item.unemployment_rate))
    const peak = Math.max(...data.filter((item) => item.period === 'covid').map((item) => item.unemployment_rate))
    const yoy = current - average(data.filter((item) => item.date === previous).map((item) => item.unemployment_rate))
    const pre = average(data.filter((item) => item.period === 'pre-covid').map((item) => item.unemployment_rate))
    const post = average(data.filter((item) => item.period === 'post-covid').map((item) => item.unemployment_rate))
    return { current, peak, yoy, pre, post, latest }
  }, [data])

  const timeline = useMemo(() => {
    const source = view === 'single' ? data.filter((item) => item.region === selectedRegion) : data
    return [...new Set(source.map((item) => item.date))].sort().map((date) => { const row: Record<string, string | number> = { date }; for (const region of regions) { const match = source.find((item) => item.date === date && item.region === region); if (match) row[region] = match.unemployment_rate } return row })
  }, [data, view, selectedRegion])
  const regionalAverages = regions.map((region) => ({ region, rate: Number(average(data.filter((item) => item.region === region).map((item) => item.unemployment_rate)).toFixed(1)) }))
  const visibleRegions = view === 'single' ? [selectedRegion] : regions

  if (error) return <main className="flex min-h-screen items-center justify-center bg-background px-6"><section role="alert" className="max-w-lg rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-lg"><h1 className="text-xl font-semibold">Unable to load unemployment data</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{error} Please check your connection and refresh the page.</p></section></main>
  if (!data.length) return <LoadingDashboard />

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-8"><header className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><Activity className="size-4" /> Labor market monitor</div><h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Indian Unemployment Trend Analysis — COVID-19 Lockdown Period (Jan–Oct 2020)</h1><p className="mt-2 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">Monthly state-level unemployment estimates grouped by zone, showing the labor-market shock and recovery during India&apos;s COVID-19 lockdown period.</p></div><div className="flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:self-auto"><CalendarDays className="size-4" /> {data[0].date} — {metrics.latest}</div></header>
  <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Current unemployment" value={formatRate(metrics.current)} detail={`${metrics.latest} average across zones`} icon={Activity} trend="down" /><MetricCard label="Peak rate" value={formatRate(metrics.peak)} detail="COVID lockdown period peak" icon={TrendingUp} /><MetricCard label="Year-over-year change" value={`${metrics.yoy > 0 ? '+' : ''}${metrics.yoy.toFixed(1)} pts`} detail="Latest comparable month" icon={ArrowDownRight} trend={metrics.yoy < 0 ? 'down' : 'up'} /><MetricCard label="Pre vs post lockdown" value={`${metrics.pre.toFixed(1)}% → ${metrics.post.toFixed(1)}%`} detail="Average rate across each period" icon={MapPin} /></section>
  <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)] sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">Unemployment rate over time</h2><p className="mt-1 text-sm text-muted-foreground">Monthly estimate by Indian zone</p></div><div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chart region filter"><div className="flex rounded-lg border border-border bg-muted p-1"><button onClick={() => setView('all')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>All regions</button><button onClick={() => setView('single')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'single' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Single region</button></div>{view === 'single' && <select aria-label="Select region" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value as Region)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring">{regions.map((region) => <option key={region}>{region}</option>)}</select>}</div></div><div className="mt-6 h-[330px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" /><ReferenceArea x1="2020-04" x2="2020-06" fill="var(--chart-3)" fillOpacity={0.1} label={{ value: 'COVID lockdown', position: 'insideTopLeft', fill: 'var(--muted-foreground)', fontSize: 11 }} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(value) => value.endsWith('-01') ? value.slice(0, 4) : ''} minTickGap={32} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(value) => `${value}%`} domain={[0, 'auto']} /><Tooltip content={<ChartTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 14 }} />{visibleRegions.map((region) => <Line key={region} type="monotone" dataKey={region} name={region} stroke={regionColors[region]} strokeWidth={view === 'single' ? 3 : 2} dot={false} activeDot={{ r: 4 }} />)}</LineChart></ResponsiveContainer></div></section>
  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)] sm:p-6"><div><h2 className="font-semibold">Regional comparison</h2><p className="mt-1 text-sm text-muted-foreground">Average unemployment rate by zone</p></div><div className="mt-6 h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={regionalAverages} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}><CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" /><XAxis type="number" domain={[0, 'auto']} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickFormatter={(value) => `${value}%`} /><YAxis dataKey="region" type="category" width={72} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="rate" name="Average rate" fill="var(--chart-2)" radius={[0, 5, 5, 0]} barSize={24} /></BarChart></ResponsiveContainer></div></section><section className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_10px_30px_-18px_var(--foreground)] sm:p-6"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Info className="size-4" /></div><div><h2 className="font-semibold">Key takeaways</h2><p className="mt-1 text-sm text-muted-foreground">What the data tells us</p></div></div><ul className="mt-5 flex flex-col gap-4 text-sm leading-6 text-muted-foreground"><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />Unemployment peaked at {formatRate(metrics.peak)} during the Jan–Oct 2020 lockdown period.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />The {regionalAverages.reduce((best, item) => item.rate > best.rate ? item : best, regionalAverages[0]).region} zone has the highest average rate in the dataset.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />The lockdown period is visibly distinct from the pre-lockdown baseline across Indian zones.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />The latest comparable reading is {formatRate(Math.abs(metrics.yoy))} point{Math.abs(metrics.yoy) === 1 ? '' : 's'} {metrics.yoy < 0 ? 'lower' : 'higher'} year over year.</li><li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />Pre-lockdown unemployment averaged {formatRate(metrics.pre)} versus {formatRate(metrics.post)} post-lockdown.</li></ul></section></div><footer className="flex flex-col gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Source: Government of India state-level unemployment data (Jan–Oct 2020), via public dataset</span><span>Loaded live from public CSV</span></footer></div></main>
}
