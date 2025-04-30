// src/frontend/src/store/store.js
import { configureStore, createSlice, createEntityAdapter } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// ——— ENTITY ADAPTERS ———
// Normaliza el estado de jugadores para lecturas y actualizaciones más rápidas
const playersAdapter = createEntityAdapter({
  selectId: (player) => player._id
})
// Normaliza el estado de resultados de partido (UI state)
const matchResultsAdapter = createEntityAdapter({
  selectId: (mr) => mr.id
})

// ——— SLICES ———
// Players slice
const playersSlice = createSlice({
  name: 'players',
  initialState: playersAdapter.getInitialState(),
  reducers: {
    setPlayers: playersAdapter.setAll
  }
})

// Match‐results slice (UI state)
const matchResultsSlice = createSlice({
  name: 'matchResults',
  initialState: matchResultsAdapter.getInitialState(),
  reducers: {
    setMatchResult: matchResultsAdapter.upsertOne,
    resetMatchResults: () => matchResultsAdapter.getInitialState()
  }
})

// Simple page slice para manejar paginación o navegación
const pageSlice = createSlice({
  name: 'page',
  initialState: { current: 1 },
  reducers: {
    setPage: (state, action) => { state.current = action.payload }
  }
})

// ——— RTK QUERY API SLICE ———
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://padnis.onrender.com' }),
  tagTypes: ['Tournament', 'Match', 'Player'],
  endpoints: (builder) => ({
    // Obtener lista de torneos
    getTournaments: builder.query({
      query: (status = 'En curso') => `tournaments?status=${status}`,
      providesTags: ['Tournament']
    }),
    // Obtener un torneo por ID
    getTournament: builder.query({
      query: (id) => `tournaments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Tournament', id }]
    }),
    // Actualizar resultado de un partido
    updateMatchResult: builder.mutation({
      query: ({ tournamentId, matchId, result }) => ({
        url: `tournaments/${tournamentId}/matches/${matchId}/result`,
        method: 'PUT',
        body: result
      }),
      invalidatesTags: (result, error, { tournamentId }) => [
        { type: 'Tournament', id: tournamentId }
      ]
    }),
    // Obtener lista de jugadores
    getPlayers: builder.query({
      query: () => 'players',
      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({ type: 'Player', id: p._id })),
              { type: 'Player', id: 'LIST' }
            ]
          : [{ type: 'Player', id: 'LIST' }]
    })
    // Puedes agregar más endpoints (clubes, invitaciones, PDF, etc.)
  })
})

// Exportar hooks de RTK Query
export const {
  useGetTournamentsQuery,
  useGetTournamentQuery,
  useUpdateMatchResultMutation,
  useGetPlayersQuery
} = api

// ——— CONFIGURE STORE ———
const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    players: playersSlice.reducer,
    matchResults: matchResultsSlice.reducer,
    page: pageSlice.reducer
  },
  middleware: (getDefault) => getDefault().concat(api.middleware)
})

// Exportar acciones para usar en componentes
export const { setPlayers } = playersSlice.actions
export const { setMatchResult, resetMatchResults } = matchResultsSlice.actions
export const { setPage } = pageSlice.actions

export default store
