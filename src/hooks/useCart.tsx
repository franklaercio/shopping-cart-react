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
      const productAlreadyInCart = cart.find(product => product.id === productId);

      if (!productAlreadyInCart) {
        const { data: product } = await api.get<Product>(`products/${productId}`);
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0){
          setCart([...cart, { ...product, amount: 1 }])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...product, amount: 1 }]));
          toast.success('Adicionado');
          return;
        } 
      }

      if (productAlreadyInCart) {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > productAlreadyInCart.amount) {
          const updatedCart = cart.map(cartItem => cartItem.id === productId ? {
            ...cartItem,
            amount: Number(cartItem.amount) + 1
          } : cartItem)

          setCart(updatedCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
          toast.success('Novo tênis adicionado!');
          return;
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      }
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

        toast.success("Tênis removido com sucesso!");

        return;
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

      if(amount < 1 || quantityInCart < 1) {
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

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      toast.success("Quantidade atualizada com sucesso!");

      return;
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
