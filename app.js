// Express
const express = require('express');
const path = require('path');
const handler = require('./utils/responseHandler');

// Load environment
const dotenv = require('dotenv');
dotenv.config();

// Routes import
const advertiserRoutes = require('./routes/advertiser');
const offersRoutes = require('./routes/offer');
const flowsRoutes = require('./routes/flows');
const dashboardRoutes = require('./routes/dashboard');
const leadRoutes = require('./routes/lead');
const userRoutes = require('./routes/user');
const teamRoutes = require('./routes/team');
const roleRoutes = require('./routes/role');
const siteDomainRoutes = require('./routes/sites/domain');
const siteGroupRoutes = require('./routes/sites/group');
const configRoutes = require('./routes/config');

// Logging
const { morganMiddleware } = require('./middleware/morgan')
const { logger } = require('./logger/index');
// Middlewares
const { handle404Error, handleDevErrors } = require('./middleware/errorHandler');
const bodyParser = require('body-parser');
const corsAllow = require('./middleware/cors');
const cookieParser = require('cookie-parser');
// Database
const mongoose = require('mongoose');
// Schedullers
const { sendLeadsWithCap, resetCaps, moveLeadsFromHoldToValid } = require('./jobs/caps');
const { sendCapNotification } = require('./jobs/notifications');

const app = express();

if (process.env.NODE_ENV === 'production') {
  // Run jobs
  sendLeadsWithCap.start();
  resetCaps.start();
  moveLeadsFromHoldToValid.start();
  // Notifications
  // sendCapNotification.start();
}

// Mongo connection
const url = `mongodb+srv://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}/${process.env.DB_NAME}`;

mongoose.Promise = require('bluebird');

mongoose.connection.on('connected', () => {
  logger.info('Mongo connected', { tags: ['mongo'] });
});
mongoose.connection.on('reconnected', () => {
  logger.info('Mongo reconnected', { tags: ['mongo']});
});
mongoose.connection.on('disconnected', () => {
  logger.info('Mongo disconnected', { tags: ['mongo'] });
});
mongoose.connection.on('close', () => {
  logger.info('Mongo closed', { tags: ['mongo'] });
});
mongoose.connection.on('error', (error) => {
  logger.error(error, {tags: ['mongo']});
});

const mongoRun = async () => {
  await mongoose.connect(url, {
    // useMongoClient: true,
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    // autoReconnect: true,
    // reconnectTries: 100,
    // reconnectInterval: 5000
  })
};
mongoRun().catch(error => logger.error(error));

// View engine setup
app.use(express.static(path.join(__dirname, 'public')));
// Disable Express header
app.disable('x-powered-by');
// Morgan setup
app.use(morganMiddleware);
// App engine setup
app.use(corsAllow);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(function(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    handler.nResponse(res, err.message)
  }
});

// Routes
app.use('/api/advertiser', advertiserRoutes);
app.use('/api/offer', offersRoutes);
app.use('/api/flow', flowsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/site/domain', siteDomainRoutes);
app.use('/api/site/group', siteGroupRoutes);
app.use('/api/config', configRoutes);
app.use('/api/lead', leadRoutes);
app.use('/api/user', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/role', roleRoutes);

// handlers
app.use(handle404Error);
app.use(handleDevErrors);

module.exports = app;
