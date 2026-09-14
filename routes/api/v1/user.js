import bcrypt from 'bcrypt';

async function userRoute(fastify, options) {
    console.log('userRoute called with options:', options);

    fastify.post('/user', {
        schema: {
            tags: ['users'],
            summary: 'Create a new user account',
            description: 'Registers a new user with username, email, and password. Password is hashed with bcrypt before storage.',
            body: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                    username: {
                        type: 'string',
                        minLength: 3,
                        maxLength: 30,
                        description: 'Unique username for the account (3-30 characters)'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address (used for login and notifications)'
                    },
                    password: {
                        type: 'string',
                        minLength: 6,
                        description: 'Plain text password (will be hashed before storage, minimum 6 characters)'
                    }
                },
                additionalProperties: false
            },
            response: {
                201: {
                    description: 'User successfully created',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    },
                    example: {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "username": "johndoe",
                        "email": "john@example.com",
                        "created_at": "2023-01-01T12:00:00Z",
                        "updated_at": "2023-01-01T12:00:00Z"
                    }
                },
                400: {
                    description: 'Validation error - missing or invalid fields',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    },
                    example: {
                        error: 'Validation failed',
                        details: 'Username must be at least 3 characters'
                    }
                },
                409: {
                    description: 'Conflict - user with username or email already exists',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    },
                    example: {
                        error: 'Conflict',
                        details: 'A user with the provided username or email already exists'
                    }
                }
            }
        }
    }, async (request, reply) => {
        const {
            username = request.body.username?.trim(), // Trim whitespace from username
            email = request.body.email?.trim().toLowerCase(), // Trim whitespace and convert email to lowercase
            password = request.body.password
        } = request.body;

        try {
            // Check if the username or email already exists
            const existingUser = await fastify.pg.query(
                'SELECT * FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );
            if (existingUser.rows.length > 0) {
                return reply.status(409).send({
                    error: 'User already exists',
                    details: 'A user with the provided username or email already exists'
                });
            }


            // Hash Password with Bcrypt
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const result = await fastify.pg.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at, updated_at',
                [username, email, hashedPassword]
            );

            return reply.status(201).send(result.rows[0]);

        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({
                error: 'Internal Server Error',
                details: err.message
            });
        }
    });
}

export default userRoute;