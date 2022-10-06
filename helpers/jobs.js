const moment = require('moment');
const { logger } = require('../logger/index');

const Job = require('../models/Jobs');

exports.startJob = async (name) => {
    const timestamp = moment();
    const job = new Job({
        name: name,
        start: timestamp
    });
    try {
        const result = await job.save();
        const jobId = result._id;
        return jobId;
    } catch(error) {
        logger.error(error);
        throw error;
    }
}

exports.updateJob = async (jobId, stepStatus, status) => {
    try {
        const result = await Job.updateOne( { "_id": jobId }, {
            $addToSet: { stepsStatus: stepStatus }
        });
        if (result.nModified !== 1) throw new Error(`Can't update or find job`);
    } catch(error) {
        logger.error(error);
        throw error;
    }
}

exports.setErrorJob = async (jobId, errorMessage, errorStack) => {
    const timestamp = moment();
    try {
        const result = await Job.updateOne( { "_id": jobId }, {
            errorMessage: errorMessage, 
            errorStack: errorStack,
            end: timestamp,
            status: false
        });
        if (result.nModified !== 1) throw new Error(`Can't update or find job`);
    } catch(error) {
        logger.error(error);
        throw error;
    }
}

exports.finishJob = async (jobId) => {
    const timestamp = moment();

    const isAnyStepFailed = (step) => {
        return step.status === false;
    }
    try {
        const job = await Job.findOne({ "_id": jobId });
        const finalStatus = job.stepsStatus.some(isAnyStepFailed);
        const result = await Job.updateOne( { "_id": jobId }, {
            end: timestamp,
            status: !finalStatus
        });
        if (result.nModified !== 1) throw new Error(`Can't update or find job`);
    } catch(error) {
        logger.error(error);
        throw error;
    }
}