import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer.');
    }

    const existentProducts = await this.productsRepository.findAllById(
      products,
    );

    const newProducts = products.map(product => {
      const existentProduct = existentProducts.find(
        findProduct => findProduct.id === product.id,
      );

      if (!existentProduct) {
        throw new AppError(`Could not find product with id ${product.id}.`);
      } else if (existentProduct.quantity < product.quantity) {
        throw new AppError(
          `Cannot order product ${product.id} with amount ${product.quantity}`,
        );
      }

      const orderProductQuantity = product.quantity;

      const updatedProduct = product;
      updatedProduct.quantity =
        existentProduct.quantity - updatedProduct.quantity;

      return {
        product_id: product.id,
        price: existentProduct.price,
        quantity: orderProductQuantity,
      };
    });

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer,
      products: newProducts,
    });

    return order;
  }
}

export default CreateOrderService;
