import React, { useState, useEffect } from 'react'
import ListItem from '@material-ui/core/ListItem'
import Checkbox from '@material-ui/core/Checkbox'
import TextField from '@material-ui/core/TextField'
import Autocomplete, { RenderInputParams } from '@material-ui/lab/Autocomplete'
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank'
import CheckBoxIcon from '@material-ui/icons/CheckBox'
import { Level, Member, Dataset, ParentMember } from '../types/dataset'

// tslint:disable: jsx-no-lambda
// tslint:disable: arrow-parens
export interface MemberSelectorProps {
    name: string
    members: Member[]
    selectedMember?: Member
    disabled: boolean
    setSelectedMember: (ms: Member | null) => void
}

export function MemberSelector(props: MemberSelectorProps): JSX.Element {
    const [selected, setSelected] = useState<Member | null>(null)
    const onChange = (event: any, value: Member | null) => {
        console.log(`onClick`, { event, value })
        setSelected(value)
        value = value || selected?.parent || null
        props.setSelectedMember(value)
    }
    const onInputChange = (event: object, value: string, reason: 'input' | 'reset' | 'clear') => {
        console.log(`onInputChange`, { event, value, reason })
    }
    console.log(`render MemberSeelector`, { props })
    return (
        <div key={props.name} style={{ display: 'inline-block', margin: 10 }}>
            <h2>{props.name}</h2>
            <Autocomplete
                options={props.members}
                getOptionLabel={(member: Member) => member.name}
                value={props.selectedMember}
                onChange={onChange}
                onInputChange={onInputChange}
                style={{ width: 200 }}
                renderInput={(params: RenderInputParams) => (
                    <TextField {...params} variant="outlined" label={props.name} />
                )}
            />
        </div>
    )
}
/***
 * Multiple autocomplete example:
 *
const icon = <CheckBoxOutlineBlankIcon fontSize="small" />
const checkedIcon = <CheckBoxIcon fontSize="small" />

            <Autocomplete
                multiple
                options={props.members}
                disableCloseOnSelect
                getOptionLabel={(member: Member) => member.name}
                onChange={onChange}
                renderOption={(member, { selected }) => (
                    <React.Fragment>
                        <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                        {member.name}
                    </React.Fragment>
                )}
                style={{ width: 500 }}
                renderInput={(params: RenderInputParams) => (
                    <TextField {...params} variant="outlined" label={props.name} />
                )}
            />
 */

export interface MultiLevelSelectorProps {
    dataset: Dataset
    selectMember: (m: Member | null) => void
}

function selectorPropsForMember(m: Member, setFn: (m: Member | null) => void): MemberSelectorProps {
    return {
        name: m.level.name,
        members: m.parent?.children || m.level.members,
        selectedMember: m,
        setSelectedMember: setFn,
        disabled: false,
    }
}

export function MultiLevelSelector(props: MultiLevelSelectorProps): JSX.Element {
    const [selected, setSelected] = useState<Member | null>(null)
    const [dropdownData, setDropdownData] = useState<MemberSelectorProps[]>([])
    const [ready, setReady] = useState(false)
    const { levels } = props.dataset

    useEffect(() => {
        console.log(`setup effect`)
        props.dataset.ready
            .then(() => {
                setReady(true)
                setSelected(props.dataset.levels[0].members[0])
            })
            .catch((e: any) => {
                console.error('error setting up MultiLevelSelector', { e })
            })
    }, [])

    useEffect(() => {
        console.log(`selected effect`, { selected })
        if (selected && ready) {
            const selectionChain = [...selected.ancestors, selected]
            const dropdowns = selectionChain.map((m: Member) => selectorPropsForMember(m, setSelected))
            console.log({ selectionChain })
            if (selectionChain.length < levels.length) {
                const lastLevel = levels[selectionChain.length]
                const lastDropdownProps = {
                    name: lastLevel.name,
                    members: selected.children || [],
                    disabled: false,
                    setSelectedMember: setSelected,
                }
                console.log(`adding last level`, { lastDropdownProps })
                dropdowns.push(lastDropdownProps)
            } else {
                console.log('no last level!')
            }
            setDropdownData(dropdowns)
        }
    }, [selected, levels, ready])

    const selectMembers = (m: Member | null) => {
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
                <ListItem key={d.name}>
                    <MemberSelector
                        name={d.name}
                        members={d.members}
                        selectedMember={d.selectedMember}
                        disabled={d.disabled}
                        setSelectedMember={selectMembers}
                        key={d.name}
                    />
                </ListItem>
            ))}
        </React.Fragment>
    )
}
