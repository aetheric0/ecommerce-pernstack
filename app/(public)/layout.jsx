'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchProducts } from "@/lib/features/product/productSlice";
import { useAuth, useUser } from "@clerk/nextjs";
import { clearCart, fetchCart, uploadCart } from "@/lib/features/cart/cartSlice";
import { clearAddresses, fetchAddress } from "@/lib/features/address/addressSlice";
import { clearRatings, fetchUserRating } from "@/lib/features/rating/ratingSlice";

export default function PublicLayout({ children }) {
    const dispatch = useDispatch();
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();

    const dirty = useSelector((state) => state.cart.dirty);
    const cartStatus = useSelector((state) => state.cart.status);

    useEffect(() => {
        dispatch(fetchProducts({}));
    }, [dispatch]);

    useEffect(() => {
        if (!isLoaded) return;

        if (user?.id) {
            const cartRequest = dispatch(fetchCart({ getToken }));
            const addressRequest = dispatch(fetchAddress({ getToken }));
            const ratingRequest = dispatch(fetchUserRating({ getToken }));
            return () => {
                cartRequest.abort();
                addressRequest.abort();
                ratingRequest.abort();
            };
        } else {
            dispatch(clearCart());
            dispatch(clearAddresses());
            dispatch(clearRatings());
        }
    }, [user?.id, isLoaded, dispatch, getToken]);

    useEffect(() => {
        if (isLoaded && user?.id && dirty && cartStatus === 'succeeded') {
            dispatch(uploadCart({ getToken }));
        }
    }, [dirty, cartStatus, user?.id, isLoaded, dispatch, getToken]);

    return (
        <>
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
