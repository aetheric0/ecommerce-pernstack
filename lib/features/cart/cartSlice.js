import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const uploadCart = createAsyncThunk('cart/uploadCart', async ({ getToken }, thunkAPI) => {
    if (typeof getToken !== 'function') return thunkAPI.rejectWithValue('Authentication is not ready')
    try {
        // Debounce inside the thunk so dispatch remains pending until the write completes.
        await new Promise((resolve) => setTimeout(resolve, 400))
        const { cartItems } = thunkAPI.getState().cart
        const token = await getToken()
        if (!token) throw new Error('Unable to authenticate cart update')
        await axios.post('/api/cart', { cart: cartItems }, { headers: { Authorization: `Bearer ${token}` } })
        return cartItems
    } catch (error) {
        return thunkAPI.rejectWithValue(error?.response?.data?.error || error.message || 'Failed to sync cart')
    }
})

export const fetchCart = createAsyncThunk('cart/fetchCart', async ({ getToken }, thunkAPI) => {
    try {
        if (typeof getToken !== 'function') throw new Error('Authentication is not ready')
        const token = await getToken()
        const { data } = await axios.get('/api/cart', { headers: { Authorization: `Bearer ${token}` }, signal: thunkAPI.signal })
        return data
    } catch (error) {
        return thunkAPI.rejectWithValue(error?.response?.data?.error || error.message || 'Failed to fetch cart')
    }
})

const totalItems = (items) => Object.values(items).reduce((sum, value) => sum + (Number(value) || 0), 0)

const cartSlice = createSlice({
    name: 'cart',
    initialState: { total: 0, cartItems: {}, dirty: false, status: 'idle', error: null },
    reducers: {
        addToCart: (state, action) => {
            const { productId } = action.payload
            state.cartItems[productId] = (state.cartItems[productId] || 0) + 1
            state.total += 1
            state.dirty = true
        },
        removeFromCart: (state, action) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId] -= 1
                if (state.cartItems[productId] <= 0) delete state.cartItems[productId]
                state.total = Math.max(0, state.total - 1)
                state.dirty = true
            }
        },
        deleteItemFromCart: (state, action) => {
            const { productId } = action.payload
            state.total = Math.max(0, state.total - (state.cartItems[productId] || 0))
            delete state.cartItems[productId]
            state.dirty = true
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
            state.dirty = false
            state.status = 'idle'
            state.error = null
            state.fetchRequestId = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCart.pending, (state, action) => {
                state.status = 'loading'
                state.error = null
                state.fetchRequestId = action.meta.requestId
            })
            .addCase(fetchCart.fulfilled, (state, action) => {
                if (state.fetchRequestId !== action.meta.requestId) return
                const received = action.payload?.cart
                if (!state.dirty) {
                    const cart = received && typeof received === 'object' && !Array.isArray(received) ? received : {}
                    state.cartItems = cart
                    state.total = totalItems(cart)
                }
                state.status = 'succeeded'
                state.fetchRequestId = null
            })
            .addCase(fetchCart.rejected, (state, action) => {
                if (state.fetchRequestId !== action.meta.requestId) return
                state.status = 'failed'
                state.error = action.payload || action.error.message
                state.fetchRequestId = null
            })
            .addCase(uploadCart.fulfilled, (state, action) => {
                if (JSON.stringify(state.cartItems) === JSON.stringify(action.payload)) state.dirty = false
            })
    },
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions
export default cartSlice.reducer
