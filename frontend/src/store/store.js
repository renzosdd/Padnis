import { configureStore, createSlice } from '@reduxjs/toolkit';

const playersSlice = createSlice({
  name: 'players',
  initialState: { list: [] },
  reducers: {
    setPlayers: (state, action) => {
      state.list = action.payload;
    },
  },
});

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