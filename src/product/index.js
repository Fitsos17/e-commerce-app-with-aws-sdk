import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { ddbClient } from "./ddbClient";

exports.handler = async (event) => {
  console.log("request: ", JSON.stringify(event, undefined, 2));

  switch (event.httpmethod) {
    case "GET":
      if (event.pathParameters != null) {
        body = await getProduct(event.parameters.id); // Get /product/{id}
      } else {
        body = await getAllProducts(); // Get /product
      }
      break;
    case "POST":
      body = await createProduct(event);
      break;
    default:
      throw new Error(`Unsupported route: ${event.httpMethod}`);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello from Product! You've hit ${event.path}\n`,
  };
};

const getProduct = async (productId) => {
  console.log("Get product");

  try {
    const params = {
      TableName: process.env.DYNAMO_DB_TABLE_NAME,
      Key: marshall({ id: productId }),
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));

    console.log(Item);
    return Item ? unmarshall(Item) : {};
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getAllProducts = async () => {
  console.log("getAllProducts");

  try {
    const params = {
      TableName: process.env.DYNAMO_DB_TABLE_NAME,
    };
    const { Items } = await ddbClient.send(new ScanCommand(params));
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createProduct = async (event) => {
  console.log(`createProduct function. Event: "${event}"`);
  try {
    const productRequest = JSON.parse(event.body);

    const productid = uuidv4();
    productRequest.id = productid;

    const params = {
      TableName: process.env.DYNAMO_DB_TABLE_NAME,
      Item: marshall(productRequest || {}),
    };

    const result = await ddbClient.send(new PutItemCommand(params));
  } catch (error) {
    console.error(error);
    throw error;
  }
};
