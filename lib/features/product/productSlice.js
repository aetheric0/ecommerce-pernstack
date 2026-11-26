import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const fetchProducts = createAsyncThunk('product/fetchProducts', async ({ storeId } = {}, thunkAPI) => {
    try {
        const { data } = await axios.get('/api/products' + (storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''), { signal: thunkAPI.signal })
        return data.products || []
    } catch (error) {
        return thunkAPI.rejectWithValue(error?.response?.data?.error || error.message || 'Failed to fetch products')
    }
})

const productSlice = createSlice({
    name: 'product',
    initialState: { list: [], status: 'idle', error: null },
    reducers: {
        setProduct: (state, action) => { state.list = action.payload },
        clearProduct: (state) => { state.list = [] },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state, action) => { state.status = 'loading'; state.error = null; state.requestId = action.meta.requestId })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                state.list = action.payload
                state.status = 'succeeded'
                state.requestId = null
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                state.status = 'failed'
                state.error = action.payload || action.error.message
                state.requestId = null
            })
    },
})

export const { setProduct, clearProduct } = productSlice.actions
export default productSlice.reducer
