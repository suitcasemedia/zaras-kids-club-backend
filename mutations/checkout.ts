import { KeystoneContext, SessionStore } from '@keystone-next/types';
import {
  CartItemCreateInput,
  OrderCreateInput,
} from '../.keystone/schema-types';
import { CartItem } from '../schemas/CartItem';
import stripeConfig from '../lib/stripe';
import { OrderItem } from '../schemas/OrderItem';
import { Product } from '../schemas/Product';

const graphql = String.raw;

interface Arguments {
  token: string;
}
export async function checkout(
  root: any,
  { token }: Arguments,
  context: KeystoneContext
): Promise<OrderCreateInput> {
  // 1.  make sure they ar signed in

  const userId = context.session.itemId;
  if (!userId) {
    throw new Error('Sorry! You must me siged in to create an order!');
  }
  // 1.5 query the current user

  const user = await context.lists.User.findOne({
    where: { id: userId },
    resolveFields: graphql`
    id 
    name 
    email 
    cart{
       id 
       quantity 
       product  {
        name 
        price 
        description 
        id 
        photo {
            id 
            image{ 
                id 
                publicUrlTransformed

            }
        }
       }
    }
    `,
  });
  console.dir(user, { depth: null });
  // 2. calculate the total price the their order

  const cartItems = user.cart.filter((cartItem) => cartItem.product);

  const amount = cartItems.reduce(function (
    tally: number,
    cartItem: CartItemCreateInput
  ) {
    return tally + cartItem.quantity * cartItem.product.price;
  },
  0);
  // 3. create the payment with stripe gate library
  console.log(amount);
  const charge = await stripeConfig.paymentIntents
    .create({
      amount,
      currency: 'GBP',
      confirm: true,
      payment_method: token,
    })
    .catch((err) => {
      console.log(err);
      throw new Error(err.message);
    });

  console.log({ charge });
  // 4 . convert the acart items to orderitems
  const orderItems = cartItems.map((cartItem) => {
    const orderItem = {
      name: cartItem.product.name,
      description: cartItem.product.description,
      price: cartItem.product.price,
      quantity: cartItem.quantity,
      photo: { connect: { id: cartItem.product.photo.id } },
    };
    return orderItem;
  });

  // 5 create the order and return it
  const order = await context.lists.Order.createOne({
    data: {
      total: charge.amount,
      charge: charge.id,
      items: { create: orderItems },
      user: { connect: { id: userId } },
    },
  });

  // 6. clean up any old cart item
  const cartItemIds = user.cart.map((cartItem) => cartItem.id);
  await context.lists.CartItem.deleteMany({
    ids: cartItemIds,
  });
  return order;
}
export default checkout;
