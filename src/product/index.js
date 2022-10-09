import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { ddbClient } from "./ddbClient";

exports.handler = async (event) => {
  console.log("request: ", JSON.stringify(event, undefined, 2));
  let body;
  try {
    switch (event.httpMethod) {
      case "GET":
        if (event.queryStringParameters != null) {
          body = await getProductsByCategory(event);
        } else if (event.pathParameters != null) {
          body = await getProduct(event.pathParameters.id); // Get /product/{id}
        } else {
          body = await getAllProducts(); // Get /product
        }
        break;
      case "POST":
        body = await createProduct(event);
        break;
      case "DELETE":
        body = await deleteProduct(event.pathParameters.id); // DELETE /product/{id}
        break;
      case "PUT":
        body = await updateProduct(event);
        break;
      default:
        throw new Error(`Unsupported route: ${event.httpMethod}`);
    }
    console.log(body);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully finished operation: ${event.httpMethod}`,
        body: body,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to perform operation",
        errorMsg: error.message,
        errorStack: error.stack,
      }),
    };
  }
};

const getProduct = async (productId) => {
  console.log("Get product");

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
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
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };
    const { Items } = await ddbClient.send(new ScanCommand(params));
    console.log(Items);
    return Items ? Items.map((item) => unmarshall(item)) : {};
  } catch (error) {
    console.error(error);
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
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(productRequest || {}),
    };

    const result = await ddbClient.send(new PutItemCommand(params));
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deleteProduct = async (productId) => {
  console.log(`deleteProduct function. productId : "${productId}"`);

  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: productId }),
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));

    console.log(deleteResult);
    return deleteResult;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const updateProduct = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    const objKeys = Object.keys(requestBody);
    console.log(
      `updateProduct function. event: "${requestBody}", objKeys: "${objKeys}"`
    );

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: event.pathParameters.id }),
      UpdateExpression: `SET ${objKeys
        .map((_, index) => `#key${index} = :value${index}`)
        .join(", ")}`,
      ExpressionAttributeNames: objKeys.reduce(
        (acc, key, index) => ({
          ...acc,
          [`#key${index}`]: key,
        }),
        {}
      ),
      ExpressionAttributeValues: marshall(
        objKeys.reduce(
          (acc, key, index) => ({
            ...acc,
            [`:value${index}`]: requestBody[key],
          }),
          {}
        )
      ),
    };

    const updateResult = await ddbClient.send(new UpdateItemCommand(params));
    console.log(updateResult);
    return updateResult;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getProductsByCategory = async (event) => {
  console.log("getProductsByCategory");
  try {
    const productId = event.pathParameters.id;
    const category = event.queryStringParameters.category;
    const params = {
      KeyConditionExpression: "id = :productId",
      FilterExpression: "contains (category, :category)",
      ExpressionAttributeValues: {
        ":productId": { S: productId },
        ":category": { S: category },
      },
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };

    const { Items } = await ddbClient.send(new QueryCommand(params));
    return Items.map((item) => unmarshall(item));
  } catch (error) {
    console.error(error);
    throw error;
  }
};
