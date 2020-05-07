export class Member {
    parent?: Member
    name: string
    level: Level
    children?: Member[]
    constructor(name: string, level: Level, parent?: Member) {
        this.name = name
        this.level = level
        this.parent = parent
    }

    get id(): string {
        return this.parent ? `${this.parent.id}.${this.name}` : this.name
    }
    get ancestors(): Member[] {
        return this.parent ? [...this.parent.ancestors, this.parent] : []
    }
    get depth(): number {
        return this.parent ? this.parent.depth + 1 : 0
    }
}

export class ParentMember extends Member {
    children: Member[]
    constructor(name: string, level: Level, parent?: Member, children: Member[] = []) {
        super(name, level, parent)
        this.children = children
    }
}

export interface Level {
    name: string
    parent?: Level
    child?: Level
    members: Member[]
}
export function linkLevels(parent: Level, child: Level): void {
    parent.child = child
    child.parent = parent
}

export interface Measure {
    name: string
}

export interface Dataset {
    levels: Level[]
    measures: Measure[]
    timePoints: Date[]

    getSeries: (member: Member, measure: Measure) => Promise<TimeSeries>
    readonly ready: Promise<boolean>
}

export interface TimeSeries {
    times: Date[]
    values: number[]
}
