const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, 
  useUnifiedTopology: true
})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const Schema = mongoose.Schema;

const exerciseUserSchema = new Schema ({
  username: {
    type: String,
    unique: true,
    required: true
  }
})

const exerciseUserModel = mongoose.model('exerciseUser', exerciseUserSchema);

const exerciseSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number, 
    required: true
  },
  date: {
    type: Date,
    required: true
  }
})

const exerciseModel = mongoose.model('exercise', exerciseSchema);

app.post('/api/exercise/new-user', (req, res) => {
  if (req.body.username) {
    let newUser = new exerciseUserModel({
      username: req.body.username
    })
    newUser.save((error, data) => {
      if (error) {
        return console.log('error')
      } 
      res.json({
        username: data.name,
        data
      })
    })
  } else {
    return res.json({
      error: 'Please add a username.'
    })
  }
})

app.get('/api/exercise/users', (req, res) => {
  exerciseUserModel.find({}, (error, data) => {
    if (error) {
      return console.log(error);
    }
    res.json(data);
  })
})

app.post('/api/exercise/add', async (req, res) => {
  try {
    const user = await exerciseUserModel.findById(req.body.userId, (error, data) => {
      if (error) {
        return res.json({
          error: 'Invalid UserId.'
        })
      }
    })
    const exercise = new exerciseModel({
      userId: user._id,
      description: req.body.description,
      date: req.body.date ? req.body.date : new Date,
      duration: req.body.duration
    })
    await exercise.save();
    res.json({
      username: user._doc.username,
      _id: user._doc._id,
      description: req.body.description,
      date: req.body.date ? req.body.date : new Date,
      duration: req.body.duration
    })
  } catch (error) {
    res.send('error');
  }
})

app.get('/api/exercise/log', async (req, res) => {
  try {
    let userMongooseResponse = await exerciseUserModel.findById(req.query.userId);
    let user = userMongooseResponse.toObject();
    let exercises = await exerciseModel.find({userId: user._id});
    if (req.query.from) {
      user.from = req.query.from;
      exercises = exercises.filter((elem) => Date.parse(req.query.from) < Date.parse(elem.date));
    }
    if (req.query.to) {
      user.to = req.query.to;
      exercises = exercises.filter((elem) => Date.parse(req.query.to) > Date.parse(elem.date));
    }
    exercises.sort((a, b) => {
      if (Date.parse(a.date) < Date.parse(b.date)) {
        return -1;
      } else {
        return 1;
      }
    })
    if (req.query.limit) {
      user.limit = req.query.limit;
      if (exercises.length > req.query.limit) {
        exercises = exercises.slice(0, req.query.limit);
      }
    }
    res.json({
      ...user,
      count: exercises.length,
      log: exercises
    });
  } catch (e) {
    return console.log(e);
  }
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
