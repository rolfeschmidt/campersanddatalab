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
import NotificationsIcon from '@material-ui/icons/Notifications'

import { XAxis, YAxis, CartesianGrid, Tooltip, Bar, ComposedChart, Area, ResponsiveContainer, Legend } from 'recharts'

import { JHUCovid19USDataset } from './jhudata/jhu-us-covid'
import { Member, TimeSeries, Level } from './types/dataset'
import { MultiLevelSelector } from './components/level'

const dataset = new JHUCovid19USDataset()

function Copyright(): JSX.Element {
    return (
        <Typography variant="body2" color="textSecondary" align="center">
            {'Copyright © '}
            <Link color="inherit" href="https://github.com/rolfeschmidt">
                Rolfe Schmidt
            </Link>{' '}
            {new Date().getFullYear()}
            {'. Data provided by '}
            <Link color="inherit" href="https://github.com/CSSEGISandData/COVID-19">
                JHU CSSE
            </Link>
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
}))

function App(): JSX.Element {
    const classes = useStyles()
    const [open, setOpen] = useState(true)

    const [member, setMember] = useState<Member | null>()
    const [series, setSeries] = useState<TimeSeries>()
    const [newCases, setnewCases] = useState<TimeSeries>()
    const [newCaseChartData, setNewCaseChartData] = useState<{ day: string; newCases: number; ma: number }[]>([])

    useEffect(() => {
        document.title = 'COVID-19 Data Explorer'
        dataset.ready
            .then(() => {
                setMember(dataset.levels[0].members[0])
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
            const madata = []
            let movingsum = 0
            for (let i = 0; i < newCases?.times.length; ++i) {
                movingsum += newCases.values[i]
                if (i > 6) {
                    movingsum -= newCases.values[i - 7]
                }
                chartdata.push({
                    day: newCases.times[i].toUTCString(),
                    ma: movingsum / 7,
                    newCases: newCases.values[i],
                })
                madata.push({ day: newCases.times[i].toUTCString(), ma: movingsum / 7 })
            }
            setNewCaseChartData(chartdata)
        }
    }, [newCases])

    const handleDrawerOpen = () => {
        setOpen(true)
    }
    const handleDrawerClose = () => {
        setOpen(false)
    }

    const levelControls = <MultiLevelSelector dataset={dataset} selectMember={setMember} />

    const renderChartLegend = (value: any, entry: any) => {
        let text = ''
        const { color } = entry
        switch (value) {
            case 'ma':
                text = '7-day moving average'
                break
            case 'newCases':
                text = 'new cases'
                break
        }
        return <span style={{ color }}>{text}</span>
    }
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
                <List>{levelControls}</List>
            </Drawer>
            <main className={classes.content}>
                <div className={classes.appBarSpacer} />
                <Container maxWidth="lg" className={classes.container}>
                    <Grid container spacing={3}>
                        {/* Chart */}
                        <Grid item xs={12} md={8} lg={12}>
                            <Paper className={classes.paper}>
                                <ResponsiveContainer height={500} width="90%">
                                    <ComposedChart
                                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                        data={newCaseChartData}
                                    >
                                        <XAxis padding={{ left: 20, right: 100 }} dataKey="day" type="category" />
                                        <YAxis type="number" />
                                        <Legend formatter={renderChartLegend} />
                                        <CartesianGrid />
                                        <Tooltip />
                                        <Bar dataKey="newCases" fill="#ff7300" maxBarSize={15} />
                                        <Area type="monotone" dataKey="ma" fill="#8884d8" stroke="#8884d8" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>
                    <Box pt={4}>
                        <Copyright />
                    </Box>
                </Container>
            </main>
        </div>
    )
}

export default App
