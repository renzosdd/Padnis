import { configureStore, createSlice } from '@reduxjs/toolkit';

const playersSlice = createSlice({
  name: 'players',
  initialState: {
    list: [],
    page: 1,
    perPage: 10,
  },
  reducers: {
    setPlayers: (state, action) => {
      state.list = action.payload;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
  },
});

export const { setPlayers, setPage } = playersSlice.actions;

const store = configureStore({
  reducer: {
    players: playersSlice.reducer,
  },
});

export default store;