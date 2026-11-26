import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const fetchAddress = createAsyncThunk('address/fetchAddress', async ({ getToken }, thunkAPI) => {
    try {
        if (typeof getToken !== 'function') throw new Error('Authentication is not ready')
        const token = await getToken()
        const { data } = await axios.get('/api/address', { headers: { Authorization: `Bearer ${token}` }, signal: thunkAPI.signal })
        return data?.newAddress || []
    } catch (error) {
        return thunkAPI.rejectWithValue(error?.response?.data?.error || error.message || 'Failed to fetch addresses')
    }
})

const addressSlice = createSlice({
    name: 'address',
    initialState: { list: [], status: 'idle', error: null, dirty: false },
    reducers: {
        addAddress: (state, action) => {
            state.list = [action.payload, ...state.list.filter((item) => item.id !== action.payload.id)]
            state.dirty = true
        },
        clearAddresses: (state) => { state.list = []; state.status = 'idle'; state.error = null; state.requestId = null; state.dirty = false },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAddress.pending, (state, action) => { state.status = 'loading'; state.error = null; state.requestId = action.meta.requestId })
            .addCase(fetchAddress.fulfilled, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                if (!state.dirty) {
                    state.list = action.payload
                    state.dirty = false
                }
                state.status = 'succeeded'
                state.requestId = null
            })
            .addCase(fetchAddress.rejected, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                state.status = 'failed'
                state.error = action.payload || action.error.message
                state.requestId = null
            })
    },
})

export const { addAddress, clearAddresses } = addressSlice.actions
export default addressSlice.reducer
