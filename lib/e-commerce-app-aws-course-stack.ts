import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SwnApiGw } from "./apigw";
import { SwnDatabase } from "./database";
import { SwnMicroservices } from "./microservices";
export class ECommerceAppAwsCourseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new SwnDatabase(this, "Database");

    const microservices = new SwnMicroservices(this, "Microservices", {
      productTable: database.productTable,
      basketTable: database.basketTable,
    });

    new SwnApiGw(this, "ApiGateway", {
      productMicroservice: microservices.productMicroservice,
      basketMicroservice: microservices.basketMicroservice,
    });
  }
}
