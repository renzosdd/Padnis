import { configureStore, createSlice } from '@reduxjs/toolkit';

// Slice para los jugadores
const playersSlice = createSlice({
  name: 'players',
  initialState: { list: [] },
  reducers: {
    setPlayers: (state, action) => {
      state.list = action.payload;
    },
  },
});

// Slice para los resultados de los partidos
const matchResultsSlice = createSlice({
  name: 'matchResults',
  initialState: {},
  reducers: {
    setMatchResult: (state, action) => {
      const { matchId, result } = action.payload;
      state[matchId] = result;
    },
    resetMatchResults: (state) => {
      return {};
    },
  },
});

// Slice para la paginación
const pageSlice = createSlice({
  name: 'page',
  initialState: { currentPage: 1 },
  reducers: {
    setPage: (state, action) => {
      state.currentPage = action.payload;
    },
  },
});

export const { setPlayers } = playersSlice.actions;
export const { setMatchResult, resetMatchResults } = matchResultsSlice.actions;
export const { setPage } = pageSlice.actions;

export const store = configureStore({
  reducer: {
    players: playersSlice.reducer,
    matchResults: matchResultsSlice.reducer,
    page: pageSlice.reducer,
  },
});

export default store;