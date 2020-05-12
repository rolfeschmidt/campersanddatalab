import { Dataset, Member, Measure, Level, TimeSeries, ParentMember, linkLevels } from '../types/dataset'
const DATA_URL =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv'

export class JHUCovid19USDataset implements Dataset {
    levels: Level[] = []
    measures: Measure[] = [{ name: 'confirmed' }, { name: 'new' }]
    timePoints: Date[] = []

    private _confirmed: { [m: string]: number[] } = {}
    private _newCases: { [m: string]: number[] } = {}
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
        const data = await fetch(DATA_URL).then((response: Response) => response.text())
        const lines = data.split('\n')
        this._readHeader(lines[0])
        for (let i = 1; i < lines.length; ++i) {
            this._readLine(lines[i])
        }
        console.log(`data keys`, Object.keys(this._confirmed))

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

    private _readLine(line: string): void {
        const parts = line.split(/,".*",/)
        if (parts.length !== 2) {
            return
        }
        const [uid, iso2, iso3, code3, fips, county, state, country] = parts[0].split(',')
        // console.log({ uid, iso2, iso3, code3, fips, county, state, country, key: `${country}.${state}.${county}` })

        const values = parts[1].split(',').map((s: string) => parseInt(s, 10))

        const countryKey = country
        const stateKey = `${country}.${state}`
        const countyKey = `${country}.${state}.${county}`
        let countryMember = this._members[countryKey] as ParentMember
        let stateMember = this._members[stateKey] as ParentMember
        if (!countryMember) {
            countryMember = new ParentMember(country, this.countryLevel)
            this._members[countryKey] = countryMember
            this.levels[0].members.push(countryMember)
            this._confirmed[countryMember.id] = new Array(values.length).fill(0)
            this._newCases[countryMember.id] = new Array(values.length).fill(0)
        }
        if (!stateMember) {
            stateMember = new ParentMember(state, this.stateLevel, countryMember)
            this._members[stateKey] = stateMember
            countryMember.children.push(stateMember)
            this.levels[1].members.push(stateMember)
            this._confirmed[stateMember.id] = new Array(values.length).fill(0)
            this._newCases[stateMember.id] = new Array(values.length).fill(0)
        }
        const leafMember = new Member(county, this.countyLevel, stateMember)
        this._members[countyKey] = leafMember
        this.levels[2].members.push(leafMember)
        stateMember.children.push(leafMember)
        this._newCases[leafMember.id] = new Array(values.length)

        this._confirmed[leafMember.id] = values
        for (let i = 0; i < values.length; ++i) {
            this._confirmed[countryMember.id][i] += values[i]
            this._confirmed[stateMember.id][i] += values[i]
            this._newCases[countryMember.id][i] += values[i] - (values[i - 1] || 0)
            this._newCases[stateMember.id][i] += values[i] - (values[i - 1] || 0)
            this._newCases[leafMember.id][i] = values[i] - (values[i - 1] || 0)
        }
    }

    async getSeries(member: Member, measure: Measure): Promise<TimeSeries> {
        await this._loaded
        console.log(`getSeries`, { member, measure })
        const measures = {
            confirmed: this._confirmed,
            newCases: this._newCases,
        } as { [k: string]: any }
        return {
            name: `${member.id}.${measure.name}`,
            displayName: `${member.name} - ${measure.name}`,
            times: this.timePoints,
            values: measures[measure.name][member.id],
        }
    }
}
