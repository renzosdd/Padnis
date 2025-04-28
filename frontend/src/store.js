import { configureStore, createSlice } from '@reduxjs/toolkit';

// Slice para los jugadores (ya lo estás usando en App.jsx)
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

export const { setPlayers } = playersSlice.actions;
export const { setMatchResult, resetMatchResults } = matchResultsSlice.actions;

export const store = configureStore({
  reducer: {
    players: playersSlice.reducer,
    matchResults: matchResultsSlice.reducer,
  },
});

export default store;