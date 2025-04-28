'use strict';
import createAPI from 'lambda-api';
import { OrgDetails, GetOrgDetails } from './lib/orgDetails';
import { UserDetails, GetUserDetails } from './lib/userDetails';

const api = createAPI({ logger: true });
const AWS = require('aws-sdk');

api.use((_req, res, next) => {
  // Add default CORS headers for every request
  res.cors({
    methods: 'GET, PUT, PATCH, POST, DELETE, OPTIONS',
  });
  // Call next to continue processing
  next();
});

api.post('/orgDetails', async (req, res, next) => {
  const result = await OrgDetails(req);
  res.cors();
  return result;
});

api.get('/getOrgDetails', GetOrgDetails);
api.post('/userDetails', UserDetails);
api.get('/getUserDetails', GetUserDetails);

export const router = async (event, context, cb) => {
  console.log('im inside router');
  // !!!IMPORTANT: Set this flag to false, otherwise the lambda function
  // won't quit until all DB connecadvanceReciepttions are closed, which is not good
  // if you want to freeze and reuse these connections
  context.callbackWaitsForEmptyEventLoop = false;
  return await api.run(event, context);
};
