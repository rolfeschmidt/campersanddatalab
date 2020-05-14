/**
 * Copyright 2020 - Rolfe Schmidt
 *
 * This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0
 * International License  (http://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
import { Dataset, Member, Measure, Level, TimeSeries, ParentMember, linkLevels } from '../types/dataset'
const CASES_URL =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv'
const DEATHS_URL =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv'

export class JHUCovid19USDataset implements Dataset {
    levels: Level[] = []
    measures: Measure[] = [{ name: 'confirmed' }, { name: 'new' }]
    population: { [key: string]: number } = {}
    timePoints: Date[] = []

    private _confirmed: { [m: string]: number[] } = {}
    private _newCases: { [m: string]: number[] } = {}
    private _deaths: { [m: string]: number[] } = {}
    private _newDeaths: { [m: string]: number[] } = {}
    private _members: { [id: string]: Member } = {}

    private _loaded: Promise<boolean>

    private countryLevel: Level = { name: 'country', members: [] }
    private stateLevel: Level = { name: 'state', members: [] }
    private countyLevel: Level = { name: 'county', members: [] }

    constructor() {
        this.levels = [this.countryLevel, this.stateLevel, this.countyLevel]
        this._loaded = this.load()

        linkLevels(this.countryLevel, this.stateLevel)
        linkLevels(this.stateLevel, this.countyLevel)
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
        // this._readHeader(dlines[0])
        for (let i = 1; i < dlines.length; ++i) {
            this._readLine(dlines[i], 'deaths')
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
        const dates = parts.slice(11)
        this.timePoints = dates.map((str: string) => new Date(str))
    }

    private _readLine(line: string, measure: string): void {
        const parts = line.split(/,".*",/)
        if (parts.length !== 2) {
            return
        }
        const [uid, iso2, iso3, code3, fips, county, state, country] = parts[0].split(',')
        // console.log({ uid, iso2, iso3, code3, fips, county, state, country, key: `${country}.${state}.${county}` })

        let values = parts[1].split(',').map((s: string) => parseInt(s, 10))

        const countryKey = country
        const stateKey = `${country}.${state}`
        const countyKey = `${country}.${state}.${county}`
        let countryMember = this._members[countryKey] as ParentMember
        let stateMember = this._members[stateKey] as ParentMember
        let leafMember = this._members[countyKey]
        if (!countryMember) {
            countryMember = new ParentMember(country, this.countryLevel)
            this._members[countryKey] = countryMember
            this.levels[0].members.push(countryMember)
            this._confirmed[countryMember.id] = new Array(values.length).fill(0)
            this._newCases[countryMember.id] = new Array(values.length).fill(0)
            this._deaths[countryMember.id] = new Array(values.length).fill(0)
            this._newDeaths[countryMember.id] = new Array(values.length).fill(0)
            this.population[countryMember.id] = 0
        }
        if (!stateMember) {
            stateMember = new ParentMember(state, this.stateLevel, countryMember)
            this._members[stateKey] = stateMember
            countryMember.children.push(stateMember)
            this.levels[1].members.push(stateMember)
            this._confirmed[stateMember.id] = new Array(values.length).fill(0)
            this._newCases[stateMember.id] = new Array(values.length).fill(0)
            this._deaths[stateMember.id] = new Array(values.length).fill(0)
            this._newDeaths[stateMember.id] = new Array(values.length).fill(0)
            this.population[stateMember.id] = 0
        }
        if (!leafMember) {
            leafMember = new Member(county, this.countyLevel, stateMember)
            this._members[countyKey] = leafMember
            this.levels[2].members.push(leafMember)
            stateMember.children.push(leafMember)
        }
        if (measure === 'confirmed') {
            this._newCases[leafMember.id] = new Array(values.length)

            this._confirmed[leafMember.id] = values
            for (let i = 0; i < values.length; ++i) {
                this._confirmed[countryMember.id][i] += values[i]
                this._confirmed[stateMember.id][i] += values[i]
                this._newCases[countryMember.id][i] += values[i] - (values[i - 1] || 0)
                this._newCases[stateMember.id][i] += values[i] - (values[i - 1] || 0)
                this._newCases[leafMember.id][i] = values[i] - (values[i - 1] || 0)
            }
        } else if (measure === 'deaths') {
            this.population[leafMember.id] = values[0]
            this.population[countryMember.id] += values[0]
            this.population[stateMember.id] += values[0]
            values = values.slice(1)
            this._newDeaths[leafMember.id] = new Array(values.length)

            this._deaths[leafMember.id] = values
            for (let i = 0; i < values.length; ++i) {
                this._deaths[countryMember.id][i] += values[i]
                this._deaths[stateMember.id][i] += values[i]
                this._newDeaths[countryMember.id][i] += values[i] - (values[i - 1] || 0)
                this._newDeaths[stateMember.id][i] += values[i] - (values[i - 1] || 0)
                this._newDeaths[leafMember.id][i] = values[i] - (values[i - 1] || 0)
            }
        }
    }

    async getSeries(member: Member, measure: Measure): Promise<TimeSeries> {
        await this._loaded
        console.log(`getSeries`, { member, measure })
        const measures = {
            confirmed: this._confirmed,
            newCases: this._newCases,
            deaths: this._deaths,
            newDeaths: this._newDeaths,
        } as { [k: string]: any }
        return {
            name: `${member.id}.${measure.name}`,
            displayName: `${member.name} - ${measure.name}`,
            times: this.timePoints,
            values: measures[measure.name][member.id],
        }
    }
}
