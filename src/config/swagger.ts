import type { Express } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Chuoi Xanh Viet API',
      version: '1.0.0',
      description: 'API documentation for Chuoi Xanh Viet backend'
    },
    servers: [
      {
        url: 'http://localhost:8000'
      },
      {
        url: 'http://178.128.98.214:8001'
      }
    ]
  },
  apis: ['src/docs/**/*.ts']
}

const swaggerSpec = swaggerJsdoc(options)

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}
