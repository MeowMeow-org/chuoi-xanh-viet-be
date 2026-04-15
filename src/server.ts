import 'dotenv/config'
import express from 'express'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import { syncResponseMiddleware } from './middlewares/response.middleware'
import router from './routers'
import { setupSwagger } from './config/swagger'
import { corsConfig } from './config/cors'
import { loggerMiddleware } from './middlewares/logger.middleware'
import { registerAnchorEventListeners } from './modules/anchor/anchor.listeners'

const app = express()
const PORT = Number(process.env.PORT) || 8000

app.use(corsConfig)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})

app.use(loggerMiddleware)

app.use(express.json())
registerAnchorEventListeners()
setupSwagger(app)

app.get('/', (req, res) => {
  res.send('Hello!')
})

/* ======= ROUTES ======= */
//trả về response chuẩn dưới dạng json
app.use(syncResponseMiddleware)
app.use('/v1/api', router)

/* ======= ERROR HANDLER ======= */

app.use(defaultErrorHandler)

/* ======= START SERVER ======= */

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
      console.log(`http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Error starting server:', error)
    process.exit(1)
  }
}

startServer()
