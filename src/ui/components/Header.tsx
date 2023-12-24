import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import ColorModeContext from "@/ui/contexts/colorModeContext"
import { Session } from "@/ui/types"
import CancelIcon from "@mui/icons-material/Cancel"
import DarkIcon from "@mui/icons-material/DarkModeOutlined"
import LightIcon from "@mui/icons-material/LightModeOutlined"
import RestartIcon from "@mui/icons-material/RefreshOutlined"
import SearchIcon from "@mui/icons-material/Search"
import { Box, Grid, Tooltip, Typography } from "@mui/material"
import AppBar from "@mui/material/AppBar"
import IconButton from "@mui/material/IconButton"
import InputBase from "@mui/material/InputBase"
import { styled, useTheme } from "@mui/material/styles"
import Toolbar from "@mui/material/Toolbar"
import debounce from "lodash.debounce"
import { Link, useNavigate, useParams } from "react-router-dom"

import usePrevious from "@/ui/hooks/usePrevious"
import AccountMenu from "@/ui/components/menus/AccountMenu"

import ColorMenu from "./menus/ColorMenu"

const PREFIX = "AppBar"

const classes = {
  search: `${PREFIX}-search`,
  searchIcon: `${PREFIX}-searchIcon`,
  inputRoot: `${PREFIX}-inputRoot`,
  inputInput: `${PREFIX}-inputInput`,
}

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  [`& .${classes.search}`]: {
    height: "48px",
    display: "flex",
    borderRadius: 6 * theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    width: "100%",
    maxWidth: "420px",
    color: theme.palette.text.primary,
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },

  [`& .${classes.searchIcon}`]: {
    padding: theme.spacing(1.25),
    height: "100%",
    display: "flex",
    alignItems: "center",
    color: theme.palette.text.primary,
  },

  [`& .${classes.inputRoot}`]: {
    color: theme.palette.text.primary,
    width: "90%",
  },

  [`& .${classes.inputInput}`]: {
    padding: theme.spacing(1.25),
    transition: theme.transitions.create("width"),
    color: theme.palette.text.primary,
    width: "100%",
    fontSize: "0.8em",
    [theme.breakpoints.up("sm")]: {
      fontSize: "1em",
    },
  },
}))

const cleanSearchInput = (input: string) => input.trim().replace(/\s+/g, " ")

const SearchBar = () => {
  const [query, setQuery] = useState("")

  const navigate = useNavigate()

  const params = useParams()

  const prevType = usePrevious(params.type)

  const debouncedSearch = useCallback(
    debounce(
      (newValue: string) => navigate(`/search/${newValue.trimEnd()}`),
      1000
    ),
    [params.type]
  )

  const updateQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
    const cleanInput = cleanSearchInput(event.target.value)
    if (cleanInput) {
      debouncedSearch(cleanInput)
    }
  }, [])

  useEffect(() => {
    if (prevType == "search" && params.type != prevType) setQuery("")
    else if (params.type == "search") setQuery(params["*"] as any)
  }, [params.type, prevType, params["*"]])

  return (
    <Box className={classes.search}>
      <Box className={classes.searchIcon}>
        <SearchIcon />
      </Box>
      <InputBase
        placeholder="Search Drive...."
        classes={{
          root: classes.inputRoot,
          input: classes.inputInput,
        }}
        value={query}
        inputProps={{
          "aria-label": "search",
          enterKeyHint: "search",
          autoComplete: "off",
        }}
        onChange={updateQuery}
      />
      <Box className={classes.searchIcon}>
        <IconButton
          style={{ height: "35px", width: "35px" }}
          onClick={() => setQuery("")}
          size="large"
        >
          <CancelIcon />
        </IconButton>
      </Box>
    </Box>
  )
}

export default function Header({ session }: { session?: Session | null }) {
  const { palette } = useTheme()

  const { toggleColorMode, resetTheme } = useContext(ColorModeContext)

  return (
    <StyledAppBar
      sx={{
        flexGrow: 1,
        backgroundColor: "background.default",
        maxHeight: 64,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
      color="default"
      position="fixed"
    >
      <Toolbar sx={{ margin: "auto 0 auto 0" }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item>
            <Typography
              component={Link}
              color="inherit"
              to={"/my-drive"}
              sx={{
                fontWeight: 500,
                letterSpacing: 0.5,
                fontSize: 20,
                textDecoration: "none",
              }}
            >
              TelDrive
            </Typography>
          </Grid>
          <Grid
            item
            xs
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "flex-end",
            }}
          >
            {session && <SearchBar />}
          </Grid>
          <Grid item>
            <ColorMenu />
          </Grid>
          <Grid item>
            <Tooltip title="Switch Theme">
              <IconButton
                size="large"
                color="inherit"
                onClick={toggleColorMode}
              >
                {palette.mode === "light" ? <DarkIcon /> : <LightIcon />}
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip title="Reset">
              <IconButton size="large" color="inherit" onClick={resetTheme}>
                <RestartIcon />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item>
            <AccountMenu />
          </Grid>
        </Grid>
      </Toolbar>
    </StyledAppBar>
  )
}
