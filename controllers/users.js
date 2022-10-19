const handler = require('../utils/responseHandler');
const { encryptPassword, checkPassword } = require('../utils/bcrypter');
const { createToken, createInfiniteToken } = require('../utils/tokenHelper');
const { logger } = require('../logger/index');
const _ = require('lodash');

const User = require('../models/Users');
const Team = require('../models/Teams');

const AFFILIATE_ROLE = 'affiliate';
const TEAMLEAD_ROLE = 'teamlead';
const ADMIN_ROLE = 'admin';

exports.createAdmin = async (req, res, next) => {
  const userId = req.body.userId;

  const { login, password, dashboardName ,secret } = { ...req.body };

  if (!login) return handler.errorMessage(res, 'Login is empty!');
  if (!password) return handler.errorMessage(res, 'Password is empty!');
  if (!dashboardName) return handler.errorMessage(res, 'Dashboard name is empty!');
  if (!dashboardName) return handler.errorMessage(res, 'Secret is empty!');
  if (process.env.SECRET !== secret) return handler.errorMessage(res, 'Wrong secret!');

  const isLoginExists = await User.findOne({ login: login.toLowerCase() });
  const isDashboardNameExists = await User.findOne({ dashboardName: dashboardName.toLowerCase() });

  if (isLoginExists || isDashboardNameExists) return handler.errorMessage(res, 'User exist!');
  const hashPassword = await encryptPassword(password);

  try {
    const user = new User({
      login: login,
      password: hashPassword,
      role: ADMIN_ROLE,
      dashboardName: dashboardName,
      isActive: true,
      creator: userId
    });
    await user.save();
    logger.info(`User created: ${login}`);
  } catch (error) {
    throw error;
  }

  return handler.pResponse(res, {
    message: 'User created.'
  }, req);
};

exports.loginUser = async (req, res) => {
  const { login, password } = { ...req.body };
  
  if (!login) return handler.errorMessage(res, 'Login is empty!');
  if (!password) return handler.errorMessage(res, 'Password is empty!');
  const userData = await User.findOne({ login: login });
  if (!userData) return handler.errorMessage(res, 'Login or password is incorrect.');
  if(!userData.isActive) return handler.errorMessage(res, 'Login or password is incorrect.');

  const isPasswordValid = await checkPassword(password, userData.password);
  if (!isPasswordValid) return handler.errorMessage(res, 'Login or password is incorrect.');
  
  let token;
  const isAdmin = userData.role === 'admin';
  try {
    token = await createToken({
      login: userData.login,
      userId: userData._id,
      role: userData.role,
      dashboardName: userData.dashboardName,
    }, isAdmin);
  } catch (error) {
    throw error;
  }

  return handler.pResponse(res, {
    message: 'User logged in',
    token: token.token,
    role: userData.role,
    dashboardName: userData.dashboardName,
    userId: userData._id,
    expiresIn: token.expiresIn,
  }, req);

};

exports.resetUserPassword = async (req, res) => {
  const { userId, password } = { ...req.body };
  if (!userId) return handler.errorMessage(res, 'User ID is empty!');
  if (!password) return handler.errorMessage(res, 'Password is empty!');

  try {
      const userData = await User.findOne({ _id: userId });
      if (!userData) return handler.errorMessage(res, 'User not found');

      const newHashPassword = await encryptPassword(password);

      await User.updateOne(
          {
              _id: userId
          },
          {
              password: newHashPassword
          }
      );

      return handler.pResponse(res, { 
          message: 'User password updated'
      }, req);
  } catch (error) {
      throw error;
  }
};

exports.createAffiliate = async (req, res) => {
  const creator = req.userData.userId;
  const { login, password, dashboardName, email, teamId, role } = { ...req.body };

  if (!login) return handler.errorMessage(res, 'Login is empty!');
  if (!password) return handler.errorMessage(res, 'Password is empty!');
  if (!dashboardName) return handler.errorMessage(res, 'Dashboard name is empty!');
  if (!teamId) return handler.errorMessage(res, 'Team is empty!');
  if (!role) return handler.errorMessage(res, 'Role is empty!');

  const isLoginExists = await User.findOne({ login: login.toLowerCase() });
  const isDashboardNameExists = await User.findOne({ dashboardName: dashboardName.toLowerCase() });

  if (isLoginExists || isDashboardNameExists) return handler.errorMessage(res, 'User exist!');
  const hashPassword = await encryptPassword(password);

  let userId;
  try {
    const team = await Team.findById(teamId);
    if (!team) return handler.errorMessage(res, 'Team not found!');

    const user = await User.create({
      login,
      password: hashPassword,
      role,
      dashboardName,
      email,
      teamId,
      isActive: true,
      creator
    })
    userId = user._doc._id;

    const token = await createInfiniteToken({
      login: login,
      userId: userId,
      dashboardName: dashboardName,
      role,
      team: team.name
    });

    user.apiToken = token;
    await user.save();

    logger.info(`Affiliate created: ${login}`);
    return handler.pResponse(res, {
      message: 'Affiliate created.'
    }, req);
  } catch (error) {
    await User.deleteOne({ "_id": userId });
    throw error;
  }
};

exports.getAffiliates = async (req, res) => {
  let affiliates;
  let total;
  try {
    affiliates = await User.find({ role: { $ne: 'admin' } }, { password: 0 });
    total = affiliates.length;
  } catch (error) {
    throw error;
  }

  const sortedAffiliates = _.orderBy(affiliates, ['isActive', 'team'], ['desc', 'asc']);

  return handler.pResponse(res, {
    message: 'Affiliates list',
    affiliates: sortedAffiliates,
    total: total
  }, req);
};

exports.getAffiliate = async (req, res) => {
  const affiliateId = req.params.id;
  if (!affiliateId) return handler.errorMessage(res, `No 'id' parameter value.`);

  let affiliate;
  try {
    affiliate = await User.findOne({ _id: affiliateId, role: { $ne: 'admin' } }, { password: 0 });
    if (!affiliate) return handler.errorMessage(res, 'Affiliate not found.');
  } catch (error) {
    throw error;
  }

  return handler.pResponse(res, {
    affiliate: affiliate
  }, req);
};

exports.updateAffiliate = async (req, res) => {
  const { login, dashboardName, email, role, teamId } = { ...req.body };
  const affiliateId = req.params.id;

  if (!login) return handler.errorMessage(res, 'Login is empty!');
  if (!dashboardName) return handler.errorMessage(res, 'Dashboard name is empty!');
  if (!role) return handler.errorMessage(res, 'Role is empty!');
  if (role.toLowerCase() === ADMIN_ROLE) return handler.errorMessage(res, 'Not valid role');

  const token = await createInfiniteToken({
    login,
    userId: affiliateId,
    dashboardName,
    role,
    teamId
  });

  try {
    await User.updateOne(
      {
        _id: affiliateId,
      },
      {
        login,
        apiToken: token,
        dashboardName,
        email,
        role,
        teamId
      }
    );
  } catch (error) {
    throw error;
  }

  return handler.pResponse(res, {
    message: `Affiliate updated`
  }, req);
};

exports.deleteAffiliate = async (req, res) => {
  const affiliateId = req.params.id;

  try {
    const deleteResult = await User.deleteOne({ "_id": affiliateId, role: { $in: [ AFFILIATE_ROLE, TEAMLEAD_ROLE ] } });
    if (deleteResult.deletedCount === 0) throw new Error(`Can't delete affiliate`);

  } catch (error) {
    throw error;
  }

  return handler.pResponse(res, {
    message: `Affiliate deleted`
  }, req);
};

exports.changeAffiliateState = async (req, res) => {
  const affiliateId = req.params.id;
  if (!affiliateId) return handler.errorMessage(res, `No 'id' parameter value.`);

  let affiliate;
  try {
    affiliate = await User.findOne({ _id: affiliateId, role: { $in: [ AFFILIATE_ROLE, TEAMLEAD_ROLE ] } });
    if (!affiliate) return handler.errorMessage(res, 'Affiliate not found.');

    await User.updateOne({ _id: affiliateId, role: { $in: [ AFFILIATE_ROLE, TEAMLEAD_ROLE ] } }, { isActive: !affiliate.isActive });
  } catch (error) {
    throw error;
  }

  return handler.pResponse(res, {
    message: 'Affiliate updated'
  }, req);
};

exports.changeAffiliatePassword= async (req, res) => {
  const affiliateId = req.params.id;
  const { password } = { ...req.body };

  if (!affiliateId) return handler.errorMessage(res, `No 'id' parameter value.`);
  if (!password) return handler.errorMessage(res, `No 'password' body value.`);

  const affiliate = await User.findOne({ _id: affiliateId, role: { $in: [ AFFILIATE_ROLE, TEAMLEAD_ROLE ] } });
  if (!affiliate) return handler.errorMessage(res, 'Affiliate not found.');

  const hashPassword = await encryptPassword(password);
  await User.updateOne({ _id: affiliateId }, { password: hashPassword });

  return handler.pResponse(res, {
    message: 'Affiliate password updated'
  }, req);
};