async function exampleRoute(fastify, options) {
  console.log('exampleRoute called with options:', options);
  fastify.get('/example', async (request, reply) => {
    return { message: 'Hello World' };
  });
}
module.exports = exampleRoute;