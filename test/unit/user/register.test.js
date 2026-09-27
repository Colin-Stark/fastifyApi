import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import userPlugin from '../../../routes/api/v1/user';
import postgresPlugin from '@fastify/postgres';
//
// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

describe('User Registration Edge Cases', () => {
  let app;

  beforeAll(async () => {
    app = fastify();
    app.register(postgresPlugin, {
      connectionString: process.env.DATABASE_URL
    });
    app.register(userPlugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Test successful registration
  it('should create a new user with valid data', async () => {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const email = `testuser_${timestamp}@example.com`;
    const password = timestamp.toString();

    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: username,
        email: email,
        password: password
      }
    });

    expect(response.statusCode).toBe(201);
    const user = response.json();
    expect(user).toHaveProperty('id');
    expect(user.username).toBe(username);
    expect(user.email).toBe(email);
    expect(user).toHaveProperty('created_at');
    expect(user).toHaveProperty('updated_at');
  });

  // Test username validation - too short
  it('should reject username too short (< 3 characters)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: 'ab', // 2 characters
        email: 'test@example.com',
        password: 'password123'
      }
    });

    expect(response.statusCode).toBe(400);
    const error = response.json();
    // For app.inject() with schema validation, error is just "Bad Request"
    // The specific validation message is not available in this context
    expect(error.error).toBe('Bad Request');
  });

  // Test username validation - too long
  it('should reject username too long (> 30 characters)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: 'a'.repeat(31), // 31 characters
        email: 'test@example.com',
        password: 'password123'
      }
    });

    expect(response.statusCode).toBe(400);
    const error = response.json();
    // For app.inject() with schema validation, error is just "Bad Request"
    // The specific validation message is not available in this context
    expect(error.error).toBe('Bad Request');
  });

  // Test email validation - invalid format
  it('should reject invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: 'validuser',
        email: 'invalid-email', // Missing @ and domain
        password: 'password123'
      }
    });

    expect(response.statusCode).toBe(400);
    const error = response.json();
    // For app.inject() with schema validation, error is just "Bad Request"
    // The specific validation message is not available in this context
    expect(error.error).toBe('Bad Request');
  });

  // Test password validation - too short
  it('should reject password too short (< 6 characters)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: 'validuser',
        email: 'test@example.com',
        password: '123' // 3 characters
      }
    });

    expect(response.statusCode).toBe(400);
    const error = response.json();
    // For app.inject() with schema validation, error is just "Bad Request"
    // The specific validation message is not available in this context
    expect(error.error).toBe('Bad Request');
  });

  // Test missing required fields
  it('should reject missing username', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        email: 'test@example.com',
        password: 'password123'
        // Missing username
      }
    });

    expect(response.statusCode).toBe(400);
    const error = response.json();
    // For app.inject() with schema validation, error is just "Bad Request"
    // The specific validation message is not available in this context
    expect(error.error).toBe('Bad Request');
  });

  it('should reject missing email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: 'validuser',
        password: 'password123'
        // Missing email
      }
    });

    expect(response.statusCode).toBe(400);
    const error = response.json();
    // For app.inject() with schema validation, error is just "Bad Request"
    // The specific validation message is not available in this context
    expect(error.error).toBe('Bad Request');
  });

  it('should reject missing password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: 'validuser',
        email: 'test@example.com'
        // Missing password
      }
    });

    expect(response.statusCode).toBe(400);
    const error = response.json();
    // For app.inject() with schema validation, error is just "Bad Request"
    // The specific validation message is not available in this context
    expect(error.error).toBe('Bad Request');
  });

  // Test whitespace handling
  it('should trim whitespace from username', async () => {
    const timestamp = Date.now();
    const username = `  testuser_${timestamp}  `; // With spaces
    const email = `testuser_${timestamp}@example.com`;
    const password = timestamp.toString();

    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: username,
        email: email,
        password: password
      }
    });

    expect(response.statusCode).toBe(201);
    const user = response.json();
    expect(user.username).toBe(`testuser_${timestamp}`); // Should be trimmed
  });

  // Test duplicate username
  it('should reject duplicate username', async () => {
    const timestamp = Date.now();
    const username = `duplicateuser_${timestamp}`;
    const email1 = `user1_${timestamp}@example.com`;
    const email2 = `user2_${timestamp}@example.com`;
    const password = timestamp.toString();

    // Create first user
    await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: username,
        email: email1,
        password: password
      }
    });

    // Try to create second user with same username
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: username, // Same username
        email: email2, // Different email
        password: password
      }
    });

    expect(response.statusCode).toBe(409);
    const error = response.json();
    expect(error.error).toBe('User already exists');
    expect(error.details).toContain('A user with the provided username or email already exists');
  });

  // Test duplicate email
  it('should reject duplicate email', async () => {
    const timestamp = Date.now();
    const username1 = `user1_${timestamp}`;
    const username2 = `user2_${timestamp}`;
    const email = `duplicateemail_${timestamp}@example.com`;
    const password = timestamp.toString();

    // Create first user
    await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: username1,
        email: email,
        password: password
      }
    });

    // Try to create second user with same email
    const response = await app.inject({
      method: 'POST',
      url: '/user/register',
      payload: {
        username: username2, // Different username
        email: email, // Same email
        password: password
      }
    });

    expect(response.statusCode).toBe(409);
    const error = response.json();
    expect(error.error).toBe('User already exists');
    expect(error.details).toContain('A user with the provided username or email already exists');
  });
});