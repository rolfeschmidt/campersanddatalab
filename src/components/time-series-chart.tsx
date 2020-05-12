import React, { useEffect, useState } from 'react'
import { TimeSeries } from '../types/dataset'
import { ComposedChart, XAxis, YAxis, Legend, CartesianGrid, Bar, Area, Tooltip, ResponsiveContainer } from 'recharts'

export interface TimeSeriesChartProps {
    timeSeries: TimeSeries[]
}
export function TimeSeriesChart(props: TimeSeriesChartProps): JSX.Element {
    const [tsmap, settsmap] = useState<{ [k: string]: TimeSeries }>({})
    const [chartData, setChartData] = useState<{ [k: string]: string | number }[]>([])
    const window = 7

    useEffect(() => {
        // TODO: line up date ranges
        const newtsmap: { [k: string]: TimeSeries } = {}
        for (const ts of props.timeSeries) {
            newtsmap[ts.name] = ts
            const ma = computeMovingAverage(ts, window)
            newtsmap[ma.name] = ma
        }

        const newChartData = []
        const timeRange = props.timeSeries[0]?.times || [] // TODO: this should be union of all ranges
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < timeRange.length; ++i) {
            const dataEntry: { [k: string]: string | number } = { time: printTime(timeRange[i]) }
            for (const ts of Object.values(newtsmap)) {
                dataEntry[ts.name] = ts.values[i]
            }
            newChartData.push(dataEntry)
        }
        setChartData(newChartData)
        settsmap(newtsmap)
    }, [props.timeSeries])

    const renderChartLegend = (value: any, entry: any) => {
        const text = tsmap[value]?.displayName
        const { color } = entry

        return <span style={{ color }}>{text}</span>
    }

    const bars = () => {
        const bs = []
        for (const ts of props.timeSeries) {
            bs.push(<Bar dataKey={ts.name} maxBarSize={15} key={ts.name} />)
            bs.push(<Area type="monotone" dataKey={`${ts.name}.ma${window}`} key={`${ts.name}.ma${window}`} />)
        }
        console.log(bs)
        return bs
    }
    console.log(`chartData`, { chartData })
    return (
        <ResponsiveContainer height={500} width="90%">
            <ComposedChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }} data={chartData}>
                <XAxis padding={{ left: 20, right: 100 }} dataKey="time" type="category" />
                <YAxis type="number" />
                <Legend formatter={renderChartLegend} />
                <CartesianGrid />
                <Tooltip />
                {bars()}
            </ComposedChart>
        </ResponsiveContainer>
    )
}

function printTime(d: Date): string {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function computeMovingAverage(ts: TimeSeries, window: number): TimeSeries {
    let movingsum = 0
    const maValues = []
    for (let i = 0; i < ts.times.length; ++i) {
        movingsum += ts.values[i]
        if (i > window - 1) {
            movingsum -= ts.values[i - window]
        }
        maValues.push(movingsum / window)
    }
    return {
        times: [...ts.times],
        values: maValues,
        name: `${ts.name}.ma${window}`,
        displayName: `${ts.displayName} - Moving Average`,
    }
}
