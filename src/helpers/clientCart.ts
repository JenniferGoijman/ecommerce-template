"use client";

import { getProducts } from "./getProducts";
import { CartDocument, ItemDocument, VariantsDocument } from "@/types/types";
import { serverSession } from "./serverSession";
import { createCart, saveCart } from "./serverCart";

export const addToCart = async (
  productId: string,
  color: string,
  size: string,
  quantity: number,
  variantId: string,
  cartItems: any,
  setCartItems: any,
  userCart: any,
  setUserCart: any
) => {

  const newItem = {
    productId,
    color,
    size,
    quantity,
    variantId
  };

  const session = await serverSession();

  let updatedCart = [...cartItems];

  const existingItemIndex = updatedCart.findIndex(
    (item) =>
      item.productId === productId &&
      item.color === color &&
      item.size === size
  );

  if (existingItemIndex !== -1) {
    updatedCart[existingItemIndex].quantity += quantity;
  } else {
    updatedCart = [...updatedCart, newItem];
  }

  if (session) {
    try {
      const userId = session.user._id;

      if (!userId) {
        console.error("The user _id could not be obtained.");
        return;
      }

      let userCartToUpdate = userCart;

      if (!userCartToUpdate) {
        userCartToUpdate = await createCart(updatedCart, userId)
        console.log("Cart created successfully.");
      } else {
        const id = userCartToUpdate._id
        userCartToUpdate = await saveCart(updatedCart, id)
        console.log("Cart updated successfully.");
      }

      setUserCart(userCartToUpdate.data);
      setCartItems(updatedCart);

    } catch (error) {
      console.error("Error updating/creating cart on the server", error);
    }
  } else {
    return;
    // If there is no authenticated user, use cookies
  }
};

export const productsWislists = async (
  userCart: CartDocument,
  cartLoading: boolean,
  setCartWithProducts: any,
  setIsLoading: any
) => {
  if (userCart && userCart?.favorites) {
    const updatedCart = await Promise.all(userCart.favorites.map(async (productId: any) => {
      const matchingProduct = await getProducts(`?_id=${productId}`);
      if (matchingProduct) {
        return {
          ...matchingProduct,
        };
      }
      return null;
    }));

    setCartWithProducts(updatedCart.reverse());
    setIsLoading(false);
  } else if (!cartLoading && userCart?.favorites) {
    setIsLoading(false)
  } else if (!cartLoading && !userCart) {
    setIsLoading(false)
  }
};

export const productsCart = async (
  cartItems: [ItemDocument],
  cartLoading: boolean,
  setCartWithProducts: any,
  setIsLoading: any,
  setTotalPrice: any
) => {
  if (cartItems.length >= 1) {
    const updatedCart = (await Promise.all(
      cartItems.map(async (cartItem: ItemDocument) => {
        try {
          const matchingProduct = await getProducts(`?_id=${cartItem.productId}`);
          if (matchingProduct) {
            const matchingVariant = matchingProduct.variants.find(
              (variant: VariantsDocument) => variant.color === cartItem.color
            );
            return {
              ...cartItem,
              category: matchingProduct.category,
              image: [matchingVariant.images[0]],
              name: matchingProduct.name,
              price: matchingProduct.price,
            };
          }
        } catch (error) {
          console.error("Error getting product details:", error);
        }
      })
    )) as ItemDocument[];

    const totalPrice = calculateTotalPrice(updatedCart);
    setCartWithProducts(updatedCart.reverse());
    setIsLoading(false);
    setTotalPrice(totalPrice);
  } else if (!cartLoading && cartItems) {
    setCartWithProducts([]);
    setIsLoading(false);
  }
};

const calculateTotalPrice = (cartItems: ItemDocument[]) => {
  let totalPrice = 0;

  for (const cartItem of cartItems) {
    totalPrice += cartItem?.price * cartItem?.quantity;
  }

  return totalPrice.toFixed(2);
};