const mongoose = require('mongoose')
const dotenv = require('dotenv')
// Server should be starting file
const app = require('./app');

dotenv.config({ path: './config.env' })

const DB = process.env.DATABASE.replace('<password>', process.env.DATABASE_PASSWORD)

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology:true
}).then(con =>{
    // console.log(con.connections)
    console.log('DB connection successful')
})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`App running on port ${port}`);
})