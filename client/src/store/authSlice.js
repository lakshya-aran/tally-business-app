import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { parseError } from '../services/api';

export const fetchSession = createAsyncThunk('auth/fetchSession', async (_, { rejectWithValue }) => {
  try {
    return (await authService.me()).data;
  } catch (err) {
    return rejectWithValue(parseError(err));
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return (await authService.login(credentials)).data;
  } catch (err) {
    return rejectWithValue(parseError(err));
  }
});

export const logout = createAsyncThunk('auth/logout', async ({ everywhere = false } = {}) => {
  try {
    await (everywhere ? authService.logoutAll() : authService.logout());
  } catch {
    // Even if the request fails we clear local state.
  }
});

const initialState = {
  user: null,
  permissions: [],
  // 'idle' -> 'loading' (checking cookie) -> 'authenticated' | 'anonymous'
  status: 'idle',
  sessionExpired: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, { payload }) {
      state.user = payload.user;
      state.permissions = payload.permissions;
      state.status = 'authenticated';
    },
    sessionExpired(state) {
      if (state.status !== 'authenticated') return;
      Object.assign(state, initialState, { status: 'anonymous', sessionExpired: true });
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchSession.pending, (s) => {
      if (s.status === 'idle') s.status = 'loading';
    })
      .addCase(fetchSession.fulfilled, (s, { payload }) => {
        s.user = payload.user;
        s.permissions = payload.permissions;
        s.status = 'authenticated';
      })
      .addCase(fetchSession.rejected, (s) => {
        s.user = null;
        s.permissions = [];
        s.status = 'anonymous';
      })
      .addCase(login.fulfilled, (s, { payload }) => {
        s.user = payload.user;
        s.permissions = payload.permissions;
        s.status = 'authenticated';
        s.sessionExpired = false;
      })
      .addCase(logout.fulfilled, () => ({ ...initialState, status: 'anonymous' }));
  },
});

export const { setSession, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
