import bcrypt from 'bcrypt';

async function userRoute(fastify, options) {
    console.log('userRoute called with options:', options);

    // Helper to verify JWT token
    const verifyToken = async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                throw new Error('Missing or invalid authorization header');
            }
            const token = authHeader.split(' ')[1];
            const decoded = await fastify.jwt.verify(token);
            request.user = decoded; // Attach decoded payload to request
            return true;
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized', details: err.message });
        }
    };

    // POST /user/register - Register a new user (public)
    fastify.post('/register', {
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

    // POST /user/login - Login user and return JWT token (public)
    fastify.post('/login', {
        schema: {
            tags: ['users'],
            summary: 'Login user and get JWT token',
            description: 'Authenticates a user with email/username and password, returns a JWT token upon success.',
            body: {
                type: 'object',
                required: ['emailOrUsername', 'password'],
                properties: {
                    emailOrUsername: {
                        type: 'string',
                        description: 'Email or username for login'
                    },
                    password: {
                        type: 'string',
                        minLength: 6,
                        description: 'Plain text password (minimum 6 characters)'
                    }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    description: 'Login successful',
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                username: { type: 'string' },
                                email: { type: 'string', format: 'email' }
                            }
                        }
                    }
                },
                400: {
                    description: 'Validation error - missing fields',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                401: {
                    description: 'Invalid credentials',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                404: {
                    description: 'User not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { emailOrUsername, password } = request.body;

        if (!emailOrUsername || !password) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: 'Email/username and password are required'
            });
        }

        try {
            // Find user by email or username
            const userResult = await fastify.pg.query(
                'SELECT id, username, email, password_hash FROM users WHERE email = $1 OR username = $1',
                [emailOrUsername.toLowerCase()]
            );

            if (userResult.rows.length === 0) {
                return reply.status(404).send({
                    error: 'User not found',
                    details: 'No user found with the provided email or username'
                });
            }

            const user = userResult.rows[0];

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return reply.status(401).send({
                    error: 'Invalid credentials',
                    details: 'Password is incorrect'
                });
            }

            // Generate JWT token
            const payload = {
                sub: user.id,
                username: user.username,
                email: user.email
            };
            const token = await fastify.jwt.sign(payload);

            // Return token and user info (without password)
            return reply.send({
                accessToken: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({
                error: 'Internal Server Error',
                details: err.message
            });
        }
    });

    // GET /user - List all users (protected)
    fastify.get('/getUsers', {
        schema: {
            tags: ['users'],
            summary: 'Get all users',
            description: 'Returns a list of all users. Requires authentication.',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Successful response with users list',
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            username: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            created_at: { type: 'string', format: 'date-time' },
                            updated_at: { type: 'string', format: 'date-time' }
                        }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(request, reply);
        if (!verified) return; // verifyToken already sent response if failed

        try {
            const result = await fastify.pg.query('SELECT id, username, email, created_at, updated_at FROM users ORDER BY created_at DESC');
            return reply.send(result.rows);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // GET /user/:id - Get a single user by ID (protected)
    fastify.get('/:id', {
        schema: {
            tags: ['users'],
            summary: 'Get a user by ID',
            description: 'Returns a single user by their ID. Requires authentication.',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    description: 'Successful response with user data',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                404: {
                    description: 'User not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(request, reply);
        if (!verified) return;

        const { id } = request.params;

        try {
            const result = await fastify.pg.query('SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'User not found', details: `No user found with id ${id}` });
            }
            return reply.send(result.rows[0]);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // PUT /user/:id - Update a user (protected)
    fastify.put('/:id', {
        schema: {
            tags: ['users'],
            summary: 'Update a user',
            description: 'Updates a user\'s username, email, or password. Requires authentication.',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
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
                        description: 'User email address'
                    },
                    password: {
                        type: 'string',
                        minLength: 6,
                        description: 'Plain text password (will be hashed before storage)'
                    }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    description: 'User successfully updated',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                400: {
                    description: 'Validation error',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                404: {
                    description: 'User not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                409: {
                    description: 'Conflict - username or email already exists',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(request, reply);
        if (!verified) return;

        const { id } = request.params;
        const { username, email, password } = request.body;

        try {
            // Check if user exists
            const userCheck = await fastify.pg.query('SELECT id FROM users WHERE id = $1', [id]);
            if (userCheck.rows.length === 0) {
                return reply.status(404).send({ error: 'User not found', details: `No user found with id ${id}` });
            }

            // Check if username or email is taken by another user
            if (username || email) {
                const conflictCheck = await fastify.pg.query(
                    'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id <> $3',
                    [username ?? '', email ?? '', id]
                );
                if (conflictCheck.rows.length > 0) {
                    return reply.status(409).send({
                        error: 'Conflict',
                        details: 'Username or email already exists for another user'
                    });
                }
            }

            // Build update fields
            const updates = [];
            const values = [];
            let paramIndex = 1;

            if (username !== undefined) {
                updates.push(`username = $${paramIndex}`);
                values.push(username.trim());
                paramIndex++;
            }
            if (email !== undefined) {
                updates.push(`email = $${paramIndex}`);
                values.push(email.trim().toLowerCase());
                paramIndex++;
            }
            if (password !== undefined) {
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                updates.push(`password_hash = $${paramIndex}`);
                values.push(hashedPassword);
                paramIndex++;
            }
            // Always update updated_at
            updates.push(`updated_at = now()`);

            if (updates.length === 0) {
                return reply.status(400).send({ error: 'No fields to update', details: 'Provide at least one field to update' });
            }

            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, created_at, updated_at`;
            values.push(id);

            const result = await fastify.pg.query(query, values);
            return reply.send(result.rows[0]);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // DELETE /user/:id - Delete a user (protected)
    fastify.delete('/:id', {
        schema: {
            tags: ['users'],
            summary: 'Delete a user',
            description: 'Deletes a user by their ID. Requires authentication.',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    description: 'User successfully deleted',
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        id: { type: 'string', format: 'uuid' }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                404: {
                    description: 'User not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(request, reply);
        if (!verified) return;

        const { id } = request.params;

        try {
            const result = await fastify.pg.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'User not found', details: `No user found with id ${id}` });
            }
            return reply.send({ message: 'User deleted successfully', id });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });
}

export default userRoute;