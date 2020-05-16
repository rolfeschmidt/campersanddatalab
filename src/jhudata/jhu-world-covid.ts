/**
 * Copyright 2020 - Rolfe Schmidt
 *
 * This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0
 * International License  (http://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
import { Dataset, Member, Measure, Level, TimeSeries, ParentMember, linkLevels } from '../types/dataset'
const CASES_URL =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'
const DEATHS_URL =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv'
const RECOVERED_URL =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv'

export class JHUCovid19WorldDataset implements Dataset {
    id = 'jhu-world'
    name = 'JHU World Data'
    levels: Level[] = []
    measures: Measure[] = [
        { name: 'confirmed' },
        { name: 'newCases' },
        { name: 'deaths' },
        { name: 'newDeaths' },
        { name: 'recovered' },
        { name: 'newRecovered' },
    ]
    population: { [key: string]: number } = {}
    timePoints: Date[] = []

    private _confirmed: { [m: string]: number[] } = {}
    private _newCases: { [m: string]: number[] } = {}
    private _deaths: { [m: string]: number[] } = {}
    private _newDeaths: { [m: string]: number[] } = {}
    private _members: { [id: string]: Member } = {}
    private _newRecovered: { [m: string]: number[] } = {}
    private _recovered: { [id: string]: number[] } = {}

    private _loaded: Promise<boolean>

    private countryLevel: Level = { name: 'country', members: [] }
    private stateLevel: Level = { name: 'state', members: [] }

    constructor() {
        this.levels = [this.countryLevel, this.stateLevel]
        this._loaded = this.load()

        linkLevels(this.countryLevel, this.stateLevel)
    }

    async load(): Promise<boolean> {
        const caseData = await fetch(CASES_URL).then((response: Response) => response.text())
        const clines = caseData.split('\n')
        this._readHeader(clines[0])
        for (let i = 1; i < clines.length; ++i) {
            this._readLine(clines[i], 'confirmed')
        }
        console.log(`data keys`, Object.keys(this._confirmed))

        const deathData = await fetch(DEATHS_URL).then((response: Response) => response.text())
        const dlines = deathData.split('\n')
        for (let i = 1; i < dlines.length; ++i) {
            this._readLine(dlines[i], 'deaths')
        }

        const recoveredData = await fetch(RECOVERED_URL).then((response: Response) => response.text())
        const rlines = recoveredData.split('\n')
        for (let i = 1; i < rlines.length; ++i) {
            this._readLine(rlines[i], 'recovered')
        }
        return true
    }
    get members(): { [k: string]: Member } {
        return this._members
    }

    get ready(): Promise<boolean> {
        return this._loaded
    }

    private _readHeader(line: string): void {
        const parts = line.split(',')
        const dates = parts.slice(4)
        this.timePoints = dates.map((str: string) => new Date(str))
    }

    private _readLine(line: string, measure: string): void {
        const parts = line.split(',')
        const state = parts[0] || '<all>'
        const country = parts[1]

        const values = parts.slice(4).map((s: string) => parseInt(s, 10))

        const countryKey = country
        if (!country) {
            return
        }
        const stateKey = `${country}.${state}`
        let countryMember = this._members[countryKey]
        let stateMember = this._members[stateKey]

        if (!countryMember) {
            countryMember = new ParentMember(country, this.countryLevel)
            this._members[countryKey] = countryMember
            this.levels[0].members.push(countryMember)
            this._confirmed[countryMember.id] = new Array(values.length).fill(0)
            this._newCases[countryMember.id] = new Array(values.length).fill(0)
            this._deaths[countryMember.id] = new Array(values.length).fill(0)
            this._newDeaths[countryMember.id] = new Array(values.length).fill(0)
            this._recovered[countryMember.id] = new Array(values.length).fill(0)
            this._newRecovered[countryMember.id] = new Array(values.length).fill(0)
            this.population[countryMember.id] = 0
        }
        if (stateKey && !stateMember) {
            stateMember = new Member(state, this.stateLevel, countryMember)
            this._members[stateKey] = stateMember
            countryMember.children!.push(stateMember)
            this.levels[1].members.push(stateMember)
            this._newCases[stateMember.id] = new Array(values.length).fill(0)
            this._newDeaths[stateMember.id] = new Array(values.length).fill(0)
            this._newRecovered[stateMember.id] = new Array(values.length).fill(0)
            this.population[stateMember.id] = 0
        }

        // TODO: absract this and do it right
        if (measure === 'confirmed') {
            this._confirmed[stateMember.id] = new Array(values.length)

            this._confirmed[stateMember.id] = values
            for (let i = 0; i < values.length; ++i) {
                this._confirmed[countryMember.id][i] += values[i]
                this._newCases[countryMember.id][i] += values[i] - (values[i - 1] || 0)
                this._newCases[stateMember.id][i] = values[i] - (values[i - 1] || 0)
            }
        } else if (measure === 'deaths') {
            this._deaths[stateMember.id] = values
            this._newDeaths[stateMember.id] = new Array(values.length)

            for (let i = 0; i < values.length; ++i) {
                this._deaths[countryMember.id][i] += values[i]
                this._newDeaths[countryMember.id][i] += values[i] - (values[i - 1] || 0)
                this._newDeaths[stateMember.id][i] = values[i] - (values[i - 1] || 0)
            }
        } else if (measure === 'recovered') {
            this._recovered[stateMember.id] = values
            this._newRecovered[stateMember.id] = new Array(values.length)

            for (let i = 0; i < values.length; ++i) {
                this._recovered[countryMember.id][i] += values[i]
                this._newRecovered[countryMember.id][i] += values[i] - (values[i - 1] || 0)
                this._newRecovered[stateMember.id][i] = values[i] - (values[i - 1] || 0)
            }
        }
    }

    async getSeries(member: Member, measure: Measure): Promise<TimeSeries> {
        await this._loaded
        const measures = {
            confirmed: this._confirmed,
            newCases: this._newCases,
            deaths: this._deaths,
            newDeaths: this._newDeaths,
            recovered: this._recovered,
            newRecovered: this._newRecovered,
        } as { [k: string]: any }
        console.log(`getSeries`, { member, measure, values: measures[measure.name][member.id] })
        return {
            name: `${member.id}.${measure.name}`,
            displayName: `${member.name} - ${measure.name}`,
            times: this.timePoints,
            values: measures[measure.name][member.id] || [],
        }
    }
}
