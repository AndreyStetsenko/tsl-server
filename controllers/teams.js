const handler = require('../utils/responseHandler');
const { logger } = require('../logger/index');
const mongoose = require('mongoose');

const miscHelpers = require('../helpers/misc');
const _ = require('lodash');

const Team = require('../models/Teams');

// const User = require('../models/Users');
// exports.testTeams = async (req, res) => {
//   try {
//     const users = await User.find({});
//     const teams = [];
//     for(const user of users) {
//       const team = await Team.findOne({name: user.team});

//       await User.updateOne({
//         _id: user._id
//       }, {
//         teamId: team ? team._id : null
//       })
//       // teams.push({
//       //   user: user.dashboardName,
//       //   team: user.team,
//       //   teamId: team ? team._id : null
//       // })
//     }

//     return handler.pResponse(res, {
//       message: 'Teams list',
//       teams
//     }, req);
//   } catch (error) {
//     logger.error(error.message, error);
//     throw error;
//   }
// };

exports.getTeams = async (req, res) => {
  try {
    await miscHelpers.promiseSleep(1000);

    const teams = await Team
      .aggregate([
        { $lookup: { 
          from: 'users',
          let: {
            id: '$_id'
          },
          pipeline: [
            { $match: { $expr: { $eq: [ '$$id', '$teamId' ] }}},
            { $project: { 
              _id: 0,
              id: '$_id',
              dashboardName: 1,
              login: 1,
              role: 1,
              isActive: 1,
              creator: 1,
              createdAt: 1,
              teamId: 1,
              apiToken: 1,
              userActive: {
                $cond: { if: '$isActive', then: 1, else: 0 }
              },
              userNotActive: {
                $cond: { if: '$isActive', then: 0, else: 1 }
              }
            }},
            { $sort: { role: -1, isActive: -1, dashboardName: 1, }},
          ],
          as: 'users'
        }},
        {
          $addFields:  { 
            activeUsers: { "$sum": "$users.userActive" },
            notActiveUsers: { "$sum": "$users.userNotActive"
          }}
        },
      ]);

    const total = teams.length;

    return handler.pResponse(res, {
      message: 'Teams list',
      teams,
      total
    }, req);
  } catch (error) {
    logger.error(error.message, error);
    throw error;
  }
};

exports.createTeam = async (req, res) => {
  const userId = req.userData.userId;
  const { name } = { ...req.body };

  if (!name) return handler.errorMessage(res, 'Name is empty!');

  try {
    const team = new Team({
      name,
      isActive: true,
      creator: userId
    });
    await team.save();

    return handler.pResponse(res, {
      message: 'Team created.'
    }, req);
  } catch (error) {
    logger.error(error.message, error);
    throw error;
  }
};

exports.updateTeam = async (req, res) => {
  const { teamId, name } = { ...req.body };
  
  if (!teamId) return handler.errorMessage(res, 'Team ID is empty!');
  if (!miscHelpers.isIdValidForMongo(teamId)) return handler.errorMessage(res, `Not valid team id`);
  if (!name) return handler.errorMessage(res, 'Name is empty!');
  
  try {
    const operation = await Team.updateOne(
      {
        _id: teamId,
      },
      {
        name
      }
    );

    if(operation.nModified === 0) return handler.errorMessage(res, 'Team not updated');

    return handler.pResponse(res, {
      message: 'Team updated'
    }, req);
  } catch (error) {
    logger.error(error.message, error);
    throw error;
  }
};

exports.switchTeamState = async (req, res) => {
  const { teamId } = { ...req.body };

  if (!teamId) return handler.errorMessage(res, 'Team ID is empty.');
  if (!miscHelpers.isIdValidForMongo(teamId)) return handler.errorMessage(res, `Not valid team id.`);

  try {
    const team = await Team.findOne({
      _id: teamId
    });
    if(!team) return handler.errorMessage(res, 'Team not found');

    await Team.updateOne(
      {
        _id: teamId,
      },
      {
        isActive: !team.isActive
      }
    );

    return handler.pResponse(res, { 
      message: 'Team state updated'
    }, req);
  } catch (error) {
    logger.error(error.message, error);
    throw error;
  }
};