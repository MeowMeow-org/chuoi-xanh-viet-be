import 'dotenv/config'
import express from 'express'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import { syncResponseMiddleware } from './middlewares/response.middleware'
import router from './routers'
import { setupSwagger } from './config/swagger'

const app = express()
const PORT = 8000

app.use(express.json())
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
