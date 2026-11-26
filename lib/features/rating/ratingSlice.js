import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const fetchUserRating = createAsyncThunk('rating/fetchUserRating', async ({ getToken }, thunkAPI) => {
    try {
        if (typeof getToken !== 'function') throw new Error('Authentication is not ready')
        const token = await getToken()
        const { data } = await axios.get('/api/rating', { headers: { Authorization: `Bearer ${token}` }, signal: thunkAPI.signal })
        return data?.rating || []
    } catch (error) {
        return thunkAPI.rejectWithValue(error?.response?.data?.error || error.message || 'Failed to fetch ratings')
    }
})

const ratingSlice = createSlice({
    name: 'rating',
    initialState: { ratings: [], status: 'idle', error: null, dirty: false },
    reducers: {
        addRating: (state, action) => { state.ratings.push(action.payload); state.dirty = true },
        clearRatings: (state) => { state.ratings = []; state.status = 'idle'; state.error = null; state.requestId = null; state.dirty = false },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserRating.pending, (state, action) => { state.status = 'loading'; state.error = null; state.requestId = action.meta.requestId })
            .addCase(fetchUserRating.fulfilled, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                if (!state.dirty) {
                    state.ratings = action.payload
                    state.dirty = false
                }
                state.status = 'succeeded'
                state.requestId = null
            })
            .addCase(fetchUserRating.rejected, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                state.status = 'failed'
                state.error = action.payload || action.error.message
                state.requestId = null
            })
    },
})

export const { addRating, clearRatings } = ratingSlice.actions
export default ratingSlice.reducer
