import React, { useState, useEffect } from 'react'

import 'bootstrap/dist/css/bootstrap.min.css'

import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts'

import logo from './logo.svg'
import './App.css'
import { JHUCovid19USDataset } from './jhudata/jhu-us-covid'
import { Member, TimeSeries, Level } from './types/dataset'
import { MemberSelector, MultiLevelSelector } from './components/level'
import { stringify } from 'querystring'

const dataset = new JHUCovid19USDataset()

// tslint:disable-next-line: typedef
function App() {
    const [member, setMember] = useState<Member | null>()
    const [series, setSeries] = useState<TimeSeries>()
    const [newCases, setnewCases] = useState<TimeSeries>()
    const [newCaseChartData, setNewCaseChartData] = useState<{ day: string; newCases: number }[]>([])

    useEffect(() => {
        console.log(`series is set`, { series })
    }, [series])

    useEffect(() => {
        console.log(`member effect`, { member })
        if (member) {
            dataset
                .getSeries(member, { name: 'confirmed' })
                .then(setSeries)
                .then(() => dataset.getSeries(member, { name: 'newCases' }))
                .then(setnewCases)
                .catch((e: any) => {
                    console.error('error loading data', { e })
                })
        }
    }, [member])

    useEffect(() => {
        if (newCases && newCases.times.length > 0) {
            const chartdata = []
            for (let i = 0; i < newCases?.times.length; ++i) {
                chartdata.push({ day: newCases.times[i].toUTCString(), newCases: newCases.values[i] })
            }
            setNewCaseChartData(chartdata)
        }
    }, [newCases])

    const levelControls = <MultiLevelSelector dataset={dataset} selectMember={setMember} />

    return (
        <div className="App">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    Edit <code>src/App.tsx</code> and save to reload.
                </p>
                <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
                    Learn React
                </a>
            </header>
            <div>
                <div>{levelControls}</div>
                <div>Series: {series?.values?.join(', ') || 'loading'}</div>
                <div>
                    <BarChart width={1000} height={400} data={newCaseChartData}>
                        <XAxis padding={{ left: 20, right: 100 }} dataKey="day" type="category" />
                        <YAxis type="number" />
                        <CartesianGrid />
                        <Tooltip />
                        <Bar dataKey="newCases" fill="#ff7300" maxBarSize={15} />
                    </BarChart>
                </div>
            </div>
        </div>
    )
}

export default App
