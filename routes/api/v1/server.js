async function serverRoute(fastify, options) {
    console.log('serverRoute called with options:', options);
    fastify.get('/server', {
      schema: {
        tags: ['server'],
        summary: 'Server information endpoint',
        description: 'Returns a simple message indicating this is the server route',
        response: {
          200: {
            description: 'Successful response with server message',
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Server Route',
                description: 'Message identifying this as the server route'
              }
            },
            example: {
              message: 'Server Route'
            }
          }
        }
      }
    }, async (request, reply) => {
        return { message: 'Server Route' };
    });
}

export default serverRoute;