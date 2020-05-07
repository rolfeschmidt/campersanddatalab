import React, { useState, useEffect } from 'react'
import { DropdownButton, Dropdown, ButtonGroup } from 'react-bootstrap'
import { Level, Member, Dataset, ParentMember } from '../types/dataset'

export interface MemberSelectorProps {
    name: string
    members: Member[]
    defaultMember: Member | null
    disabled: boolean
    setSelectedMember: (m: Member | null) => void
}

export function MemberSelector(props: MemberSelectorProps): JSX.Element {
    const [selected, setSelected] = useState('')
    const [options, setOptions] = useState(
        props.members.map((member: Member) => ({ label: member.name, value: member.id }))
    )

    const selectMember = (eventKey: any, event: object) => {
        console.log(`dropdown select`, { eventKey, event })

        const member = props.members.find((m: Member) => m.id === eventKey) || props.defaultMember
        setSelected(eventKey)
        props.setSelectedMember(member)
    }
    const click = (arg: any) => {
        console.log(`onClick`, { arg })
    }
    return (
        <div key={props.name} style={{ display: 'inline-block', margin: 10 }}>
            <h2>{props.name}</h2>
            <DropdownButton id={props.name} title={props.name} onClick={click}>
                {options.map((opt: { label: string; value: string }) => (
                    <Dropdown.Item
                        eventKey={opt.value}
                        onSelect={selectMember}
                        active={selected === opt.value}
                        key={opt.value}
                    >
                        {opt.label}
                    </Dropdown.Item>
                ))}
            </DropdownButton>
            <div>{selected || '<none selected>'}</div>
        </div>
    )
}

export interface MultiLevelSelectorProps {
    dataset: Dataset
    selectMember: (m: Member | null) => void
}

function selectorPropsForMember(m: Member, setFn: (m: Member | null) => void): MemberSelectorProps {
    return {
        name: m.level.name,
        members: m.parent?.children || m.level.members,
        defaultMember: m,
        setSelectedMember: setFn,
        disabled: false,
    }
}

export function MultiLevelSelector(props: MultiLevelSelectorProps): JSX.Element {
    const [selected, setSelected] = useState<Member | null>(null)
    const [selections, setSelections] = useState<Member[]>([])
    const [dropdownData, setDropdownData] = useState<MemberSelectorProps[]>([])
    const { levels } = props.dataset

    useEffect(() => {
        console.log(`setup effect`)
        props.dataset.ready
            .then(() => {
                setSelected(props.dataset.levels[0].members[0])
            })
            .catch((e) => {
                console.error('error setting up MultiLevelSelector', { e })
            })
    }, [])

    useEffect(() => {
        console.log(`selected effect`, { selected })
        if (selected) {
            const selectionChain = [...selected.ancestors, selected]
            setSelections(selectionChain)
            const dropdowns = selectionChain.map((m: Member) => selectorPropsForMember(m, setSelected))
            if (selectionChain.length < levels.length) {
                const lastLevel = levels[selectionChain.length]
                const lastDropdownProps = {
                    name: lastLevel.name,
                    members: selected.children || [],
                    defaultMember: selected,
                    disabled: false,
                    setSelectedMember: setSelected,
                }
                dropdowns.push(lastDropdownProps)
            } else {
                console.log('no last level!')
            }
            setDropdownData(dropdowns)
        }
    }, [selected, levels])

    const selectMember = (m: Member | null) => {
        setSelected(m)
        props.selectMember(m)
    }

    useEffect(() => {
        console.log(`dropdowndata effect`, { dropdownData })
    }, [dropdownData])

    const setSelection = (m: Member | null) => {
        console.log(`setSelection`, { m })
        setSelected(m)
    }

    return (
        <React.Fragment>
            {dropdownData.map((d, i) => (
                <MemberSelector
                    name={d.name}
                    members={d.members}
                    defaultMember={d.defaultMember}
                    disabled={d.disabled}
                    setSelectedMember={selectMember}
                    key={d.name}
                />
            ))}
        </React.Fragment>
    )
}
