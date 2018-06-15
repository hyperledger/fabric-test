const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const http = require('http')

const app = express()
app.use(bodyParser.json())
app.use(cors())

require('./src/metrics.js')(app)

const port = 3000
const server = app.listen(port, () => {
     const addr = server.address()
     console.log(`Server listening at http://${addr.address}:${addr.port}`)
})