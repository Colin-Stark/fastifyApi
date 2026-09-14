async function healthRoute(fastify, options) {
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Health check endpoint',
      description: 'Returns the operational status of the API service',
      response: {
        200: {
          description: 'Successful response indicating service is healthy',
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK',
              description: 'Service status indicator'
            }
          },
          example: {
            status: 'OK'
          }
        }
      }
    }
  }, async (request, reply) => {
    return { status: 'OK' };
  });
}

export default healthRoute;