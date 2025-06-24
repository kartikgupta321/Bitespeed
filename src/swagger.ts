import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bitespeed Identity Reconciliation API',
      version: '1.0.0',
      description: 'API to reconcile customer identities based on email and phone number.'
    }
  },
  apis: ['./src/routes/*.ts'], // Where your routes are defined
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
