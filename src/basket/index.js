exports.handler = async (event) => {
  console.log("request: ", JSON.stringify(event, undefined, 2));
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: `Hello from Basket! You've hit ${event.path}\n`,
  };
};
