/**
 * Copyright 2020 - Rolfe Schmidt
 *
 * This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0
 * International License  (http://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import 'typeface-roboto'

import { makeStyles, Theme } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import Drawer from '@material-ui/core/Drawer'
import Box from '@material-ui/core/Box'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import List from '@material-ui/core/List'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import IconButton from '@material-ui/core/IconButton'
import Badge from '@material-ui/core/Badge'
import Container from '@material-ui/core/Container'
import Grid from '@material-ui/core/Grid'
import Paper from '@material-ui/core/Paper'
import Link from '@material-ui/core/Link'
import MenuIcon from '@material-ui/icons/Menu'
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'

import { JHUCovid19USDataset } from './jhudata/jhu-us-covid'
import { Member, TimeSeries, Measure, Dataset } from './types/dataset'
import { MultiLevelSelector } from './components/level'
import { FormControl, InputLabel, Select, MenuItem } from '@material-ui/core'
import { TimeSeriesChart } from './components/time-series-chart'
import { JHUCovid19WorldDataset } from './jhudata/jhu-world-covid'

const jhuUSDataset = new JHUCovid19USDataset()
const jhuWorldDataset = new JHUCovid19WorldDataset()
const datasets = {
    [jhuUSDataset.id]: jhuUSDataset,
    [jhuWorldDataset.id]: jhuWorldDataset,
}

function Copyright(): JSX.Element {
    return (
        <Typography variant="body2" color="textSecondary" align="center">
            {'Copyright © '}
            <Link color="inherit" href="https://github.com/rolfeschmidt">
                Rolfe Schmidt
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    )
}

const drawerWidth = 240

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        display: 'flex',
    },
    toolbar: {
        paddingRight: 24, // keep right padding when drawer closed
    },
    toolbarIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px',
        ...theme.mixins.toolbar,
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    appBarShift: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        marginRight: 36,
    },
    menuButtonHidden: {
        display: 'none',
    },
    title: {
        flexGrow: 1,
    },
    drawerPaper: {
        position: 'relative',
        whiteSpace: 'nowrap',
        width: drawerWidth,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    drawerPaperClose: {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
            width: theme.spacing(9),
        },
    },
    appBarSpacer: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        height: '100vh',
        overflow: 'auto',
    },
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
    paper: {
        padding: theme.spacing(2),
        display: 'flex',
        overflow: 'auto',
        flexDirection: 'column',
    },
    fixedHeight: {
        height: 240,
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}))

const search = window.location.search
const urlparams = new URLSearchParams(search)
const initSeries = urlparams.get('s1')
const initMeasure = urlparams.get('m')
const initDataset = urlparams.get('ds')

const fragment = window.location.hash

function App(): JSX.Element {
    const classes = useStyles()
    const [open, setOpen] = useState(true)

    const [member, setMember] = useState<Member | null>(null)
    const [series, setSeries] = useState<TimeSeries>()
    const [measure, setMeasure] = useState<Measure>({ name: initMeasure || 'newCases' })

    const [dataset, setDataset] = useState<Dataset>(initDataset === jhuUSDataset.id ? jhuUSDataset : jhuWorldDataset)

    useEffect(() => {
        document.title = 'COVID-19 Data Explorer'
        dataset.ready
            .then(() => {
                const initmember = (initSeries && dataset.members[initSeries]) || dataset.levels[0].members[0]
                console.log({ initSeries, initmember })
                setMember(initmember)
            })
            .catch((e: any) => {
                console.error('error loading data', { e })
            })
    }, [])
    useEffect(() => {
        console.log(`series is set`, { series })
    }, [series])

    useEffect(() => {
        console.log(`member effect`, { member })
        if (member) {
            if (member.id !== urlparams.get('s1')) {
                urlparams.set('s1', member.id)
                window.history.pushState({ s1: member.id }, '', window.location.pathname + '?' + urlparams.toString())
            }
            dataset
                .getSeries(member, measure)
                .then(setSeries)
                .catch((e: any) => {
                    console.error('error loading data', { e })
                })
        } else {
            console.log(`member effect`, { member, measure, series })
        }
    }, [member])

    useEffect(() => {
        if (member && measure) {
            if (measure.name !== urlparams.get('m')) {
                urlparams.set('m', measure.name)
                window.history.pushState({ m: measure.name }, '', window.location.pathname + '?' + urlparams.toString())
            }
            dataset
                .getSeries(member, measure)
                .then((ts: TimeSeries) => {
                    setSeries(ts)
                })
                .catch((e: any) => {
                    console.error(`error getting series`, { e })
                })
        }
    }, [member, measure])

    useEffect(() => {
        if (dataset.id !== urlparams.get('ds')) {
            urlparams.set('ds', dataset.id)
            window.history.pushState({ ds: dataset.id }, '', window.location.pathname + '?' + urlparams.toString())
        }
    }, [dataset])

    const handleDrawerOpen = () => {
        setOpen(true)
    }
    const handleDrawerClose = () => {
        setOpen(false)
    }
    const handleMeasureChange = (event: any) => {
        setMeasure({ name: event.target.value })
    }
    const handleDatasetChange = (event: any) => {
        console.log(`changing dataset: ${event.target.value}`)
        const newDataset = datasets[event.target.value]
        const newMember = newDataset.levels[0].members[0]
        setDataset(newDataset)
        setMember(newMember)
    }

    const datasetSelector = (
        <FormControl className={classes.formControl}>
            <InputLabel id="dataset-select-label">Dataset</InputLabel>
            <Select
                labelId="dataset-select-label"
                id="dataset-select"
                value={dataset.id || ''}
                onChange={handleDatasetChange}
            >
                <MenuItem value={jhuUSDataset.id}>{jhuUSDataset.name}</MenuItem>
                <MenuItem value={jhuWorldDataset.id}>{jhuWorldDataset.name}</MenuItem>
            </Select>
        </FormControl>
    )
    const measureSelector = (
        <FormControl className={classes.formControl}>
            <InputLabel id="measure-select-label">Measure</InputLabel>
            <Select
                labelId="measure-select-label"
                id="measure-select"
                value={measure.name || ''}
                onChange={handleMeasureChange}
            >
                <MenuItem value={'newCases'}>New Cases</MenuItem>
                <MenuItem value={'confirmed'}>Confirmed Cases</MenuItem>
                <MenuItem value={'newDeaths'}>New Deaths</MenuItem>
                <MenuItem value={'deaths'}>Deaths</MenuItem>
            </Select>
        </FormControl>
    )
    const levelControls = (
        <MultiLevelSelector dataset={dataset} selectMember={setMember} initMember={member} key="member-select" />
    )

    return (
        <div className={classes.root}>
            <CssBaseline />
            <AppBar position="absolute" className={clsx(classes.appBar, open && classes.appBarShift)}>
                <Toolbar className={classes.toolbar}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleDrawerOpen}
                        className={clsx(classes.menuButton, open && classes.menuButtonHidden)}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography component="h1" variant="h3" color="inherit" noWrap className={classes.title}>
                        COVID-19 Data Explorer
                    </Typography>
                    <Typography component="h2" variant="h6" color="inherit" noWrap className={classes.title}>
                        A modeling starter project for{' '}
                        <Link color="inherit" href="https://campersand.org">
                            C&amp;! 2020
                        </Link>
                        .
                    </Typography>
                    {/* <IconButton color="inherit">
                        <Badge badgeContent={4} color="secondary">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton> */}
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                classes={{
                    paper: clsx(classes.drawerPaper, !open && classes.drawerPaperClose),
                }}
                open={open}
            >
                <div className={classes.toolbarIcon}>
                    <IconButton onClick={handleDrawerClose}>
                        <ChevronLeftIcon />
                    </IconButton>
                </div>
                <Divider />
                <List>
                    {datasetSelector}
                    <br />
                    {measureSelector} {levelControls}
                </List>
            </Drawer>
            <main className={classes.content}>
                <div className={classes.appBarSpacer} />
                <Container maxWidth="lg" className={classes.container}>
                    <Grid container spacing={3}>
                        {/* Chart */}
                        <Typography component="h2" variant="h6" color="inherit" noWrap className={classes.title}>
                            {dataset.id === jhuUSDataset.id
                                ? `Population: ${jhuUSDataset.population[member?.id || ''] || ''}`
                                : null}
                        </Typography>
                        <Grid item xs={12} md={8} lg={12}>
                            <Paper className={classes.paper}>
                                <TimeSeriesChart timeSeries={series ? [series] : []} />
                            </Paper>
                        </Grid>
                    </Grid>
                    <Box pt={4}>
                        <Copyright />
                        <Typography variant="body2" color="textSecondary" align="center">
                            {'Data provided by '}
                            <Link color="inherit" href="https://github.com/CSSEGISandData/COVID-19">
                                JHU CSSE
                            </Link>
                            {'.'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" align="center">
                            {'Source code avaiable on '}
                            <Link color="inherit" href="https://github.com/rolfeschmidt/campersanddatalab">
                                GitHub
                            </Link>
                            {'.'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" align="center">
                            <Link rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">
                                <img
                                    alt="Creative Commons License"
                                    style={{ borderWidth: 0 }}
                                    src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png"
                                />
                            </Link>
                            <br />
                            This work is licensed under a{' '}
                            <Link rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">
                                Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
                            </Link>
                            .
                        </Typography>
                    </Box>
                </Container>
            </main>
        </div>
    )
}

export default App
