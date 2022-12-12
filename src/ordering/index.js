exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-type": "application/json" },
    body: `Hello from ordering. You've hit ${event.path}`,
  };
};
