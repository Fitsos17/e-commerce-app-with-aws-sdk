import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface SwnApiGwProps {
  productMicroservice: IFunction;
}

export class SwnApiGw extends Construct {
  constructor(scope: Construct, id: string, props: SwnApiGwProps) {
    super(scope, id);

    const apigw = new LambdaRestApi(this, "productApi", {
      restApiName: "Product Service",
      handler: props.productMicroservice,
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
}
