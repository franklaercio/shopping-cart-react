import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productStock: Stock = await (await api.get(`/stock/${productId}`)).data;
      const quantityInCart = updatedCart.findIndex(product => product.id === productId);

      if((quantityInCart < 0 && productStock.amount <= 0) 
          || (quantityInCart >= 0 
                && productStock.amount < updatedCart[quantityInCart].amount)) {
         toast.error('Quantidade solicitada fora de estoque');
         return;
      }

      if(quantityInCart < 0) {
        const product = await (await api.get(`products/${productId}`));

        updatedCart.push({
          ...product.data,
          amount: 1
        })
  
        setCart([...updatedCart]);
      }else {
        updatedCart[quantityInCart] = {
          ...updatedCart[quantityInCart],
          amount: updatedCart[quantityInCart].amount + 1
        }
  
        updatedCart.push(updatedCart[quantityInCart]);
  
        setCart([...updatedCart]);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
      return;
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const quantityInCart = updatedCart.findIndex(product => product.id === productId);

      if(quantityInCart >= 0) {
        updatedCart.splice(quantityInCart, 1);

        setCart([...updatedCart]);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        toast.error('Erro na remoção do produto');
        return;
      }
    } catch {
      toast.error('Erro na remoção do produto');
      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart];
      const productStock: Stock = await (await api.get(`stock/${productId}`)).data;
      const quantityInCart = updatedCart.findIndex(product => product.id === productId);

      if(quantityInCart < 0) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      if(productStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      updatedCart[quantityInCart] = {
        ...updatedCart[quantityInCart],
        amount: amount
      }

      setCart([...updatedCart]);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
      return;
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
