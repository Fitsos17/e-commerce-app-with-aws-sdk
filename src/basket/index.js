import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { ebClient } from "./eventBridgeClient";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import ddbClient from "./ddbClient";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  let body;
  try {
    switch (event.httpMethod) {
      case "GET":
        if (event.pathParameters != null) {
          body = await getBasket(event.pathParameters.userName); // GET /basket/{userName}
        } else {
          body = await getAllBaskets(); // GET /basket
        }
        break;
      case "POST":
        if (event.path == "/basket/checkout") {
          body = await checkoutBasket(event); // POST /basket/checkout
        } else {
          body = await createBasket(event); // POST /basket
        }
        break;
      case "DELETE":
        body = await deleteBasket(event.pathParameters.userName); // DELETE /basket/{userName}
        break;
      default:
        throw new Error(`Unsupported route: "${event.httpMethod}"`);
    }

    console.log(body);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully finished operation: "${event.httpMethod}"`,
        body: body,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to perform operation.",
        errorMsg: error.message,
        errorStack: error.stack,
      }),
    };
  }
};

const getBasket = async (userName) => {
  console.log("getBasket");
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ userName: userName }),
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));

    console.log(Item);
    return Item ? unmarshall(Item) : {};
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getAllBaskets = async () => {
  console.log("getAllBaskets");
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

const createBasket = async (event) => {
  console.log(`createBasket function. event : "${event}"`);
  try {
    const requestBody = JSON.parse(event.body);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(requestBody || {}),
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log(createResult);
    return createResult;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deleteBasket = async (userName) => {
  console.log(`deleteBasket function. userName : "${userName}"`);
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ userName: userName }),
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log(deleteResult);
    return deleteResult;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const checkoutBasket = async (event) => {
  console.log("checkoutBasket");

  const checkoutRequest = JSON.parse(event.body);
  if (checkoutRequest == null || checkoutRequest.userName == null) {
    throw new Error(
      `userName should exist in checkout request: ${checkoutRequest}`
    );
  }

  // 1. Get existing basket with items
  const basket = await getBasket(checkoutRequest.userName);

  // 2. Create an event json object with basket items,
  //    calculate totalprice, prepare oder create order json data to send ordering microservices
  let checkoutPayload = prepareOrderPayload(checkoutRequest, basket);

  // 3. Publish event to eventbrigdge. This will subscribe by order microservice and start ordering process.
  await publishCheckoutBasketEvent(checkoutPayload);

  // 4. Remove existing basket.
  await deleteBasket(checkoutRequest.userName);
};

const prepareOrderPayload = (checkoutRequest, basket) => {
  console.log("prepareOrderPayload");

  try {
    if (basket == null || basket.items == null) {
      throw new Error(`Items should exist in basket: ${basket}`);
    }

    // calculate total price
    let totalPrice = 0;
    basket.items.forEach((item) => (totalPrice += item.price));
    checkoutRequest.totalPrice = totalPrice;
    console.log(checkoutRequest);

    // copies all properties from basket into checkoutRequest
    Object.assign(checkoutRequest, basket);
    console.log(
      "Success prepareOrderPayload, orderPayload: " + checkoutRequest
    );
    return checkoutRequest;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const publishCheckoutBasketEvent = async (checkoutPayload) => {
  console.log("publishCheckoutBasketEvent with payload: ", checkoutPayload);

  try {
    const params = {
      Entries: [
        {
          Source: process.env.EVENT_SOURCE,
          Detail: JSON.stringify(checkoutPayload),
          DetailType: process.env.EVENT_DETAILTYPE,
          Recourses: [],
          EventBusName: process.env.EVENT_BUSNAME,
        },
      ],
    };

    const data = await ebClient.send(new PutEventsCommand(params));
    console.log("Success, event sent; requestId: ", data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
