import {
  PutItemCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import ddbClient from "./ddbClient";

exports.handler = async (event) => {
  const eventType = event["detail-type"];
  if (eventType !== undefined) {
    await eventBridgeInvocation(event);
  } else {
    return await apiGatewayInvocation(event);
  }
};

const eventBridgeInvocation = async (event) => {
  console.log(`eventBridgeInvocationFunction. event: ${event}`);

  await createOrder(event.detail);
};

const apiGatewayInvocation = async (event) => {
  let body;

  try {
    switch (event.httpMethod) {
      case "GET":
        if (event.pathParameters != null) {
          body = await getOrder(event);
        } else {
          body = await getAllOrders(event);
        }
        break;
      default:
        throw new Error(`Unsupported route: ${event.httpMethod}`);
    }

    console.log(body);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully finished operation: "${event.httpMethod}"`,
        body,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Failed to finish operation`,
        errorMsg: error.message,
        errorStack: error.stack,
      }),
    };
  }
};

const createOrder = async (basketCheckoutEvent) => {
  try {
    console.log(`createOrderFunction. Event: ${basketCheckoutEvent}`);
    const orderDate = Date.toISOString();
    basketCheckoutEvent.orderDate = orderDate;
    console.log(basketCheckoutEvent);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(basketCheckoutEvent || {}),
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));

    console.log(createResult);
    return createResult;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getOrder = async (event) => {
  console.log("getOrder");

  try {
    const userName = event.pathParameters.userName;
    const orderDate = event.queryStringParameters.orderDate;

    const params = {
      KeyConditionExpression: "userName = :userName and orderDate = :orderDate",
      ExpressionAttributeValues: {
        ":userName": { S: userName },
        orderDate: { S: orderDate },
      },
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };

    const { Items } = await ddbClient.send(new QueryCommand(params));
    console.log(Items);
    return Items.map((item) => unmarshall(item));
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getAllOrders = async (event) => {
  console.log("getAllOrders");

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
