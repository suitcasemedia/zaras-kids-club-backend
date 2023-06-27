import { list } from '@keystone-next/keystone/schema';
import { text, password, relationship } from '@keystone-next/fields';

export const User = list({
  // access:
  // ui
  ui: {
    listView: {
      initialColumns: ['cart', 'email', 'name'],
    },
  },
  fields: {
    name: text({ isRequired: true }),
    email: text({ isRequired: true, isUnique: true }),
    password: password(),
    cart: relationship({
      ref: 'CartItem.user',
      many: true,
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
      },
    }),
    // TODO, add roles, cart and orders
    products: relationship({
      ref: 'Product.user',
      many: true,
    }),
    orders: relationship({ ref: 'Order.user', many: true }),
    role: relationship({ ref: 'Role.assignedTo' }),
    // todo add access control
  },
});
