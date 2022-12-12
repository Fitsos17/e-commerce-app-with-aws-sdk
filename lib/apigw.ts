import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface SwnApiGwProps {
  productMicroservice: IFunction;
  basketMicroservice: IFunction;
  orderMicroservice: IFunction;
}

export class SwnApiGw extends Construct {
  constructor(scope: Construct, id: string, props: SwnApiGwProps) {
    super(scope, id);

    this.createProductApi(props.productMicroservice);
    this.createBasketApi(props.basketMicroservice);
    this.createOrderApi(props.orderMicroservice);
  }

  // product microservices apigw
  private createProductApi(productMicroservice: IFunction) {
    const apigw = new LambdaRestApi(this, "ProductApi", {
      restApiName: "Product Api",
      handler: productMicroservice,
      proxy: false,
    });

    const product = apigw.root.addResource("product");
    product.addMethod("GET"); // GET /product
    product.addMethod("POST"); // GET /product

    const singleProduct = product.addResource("{id}"); // /product/{id}
    singleProduct.addMethod("GET"); // GET /product/{id}
    singleProduct.addMethod("PUT"); // PUT /product/{id}
    singleProduct.addMethod("DELETE"); // DELETE /product/{id}
  }

  // basket microservices apigw
  private createBasketApi(basketMicroservice: IFunction) {
    const apigw = new LambdaRestApi(this, "BasketApi", {
      restApiName: "Basket Api",
      handler: basketMicroservice,
      proxy: false,
    });

    const basket = apigw.root.addResource("basket");
    basket.addMethod("GET"); // GET /basket
    basket.addMethod("POST"); // POST /basket

    const singleBasket = basket.addResource("{userName}");
    singleBasket.addMethod("GET"); // GET /basket/{userName}
    singleBasket.addMethod("DELETE"); // DELETE /basket/{userName}

    const checkout = basket.addResource("checkout");
    checkout.addMethod("POST"); // POST /basket/checkout
  }

  // Ordering microservices
  private createOrderApi(orderingMicroservice: IFunction) {
    const apigw = new LambdaRestApi(this, "OrderingApi", {
      restApiName: "OrderingApi",
      handler: orderingMicroservice,
      proxy: false,
    });

    const order = apigw.root.addResource("order");
    order.addMethod("GET");

    const singleOrder = order.addResource("{userName}");
    singleOrder.addMethod("GET");

    return singleOrder;
  }
}
