const mongoose = require('mongoose');

const schema = mongoose.Schema({
  login: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    minlength: 3,
    maxlength: 40
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  dashboardName: {
    type: String,
    trim: true,
    required: true,
    lowercase: true,
    minlength: 3,
    maxlength: 40
  },
  email: {
    type: String
  },
  team: {
    type: String,
    // required: true,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: false,
  },
  apiToken: {
    type: String
  },
  isActive: {
    type: Boolean
  },
  postbacks: {
    settings: {
      url: String,
      params: String
    },
    onSuccessSend: Boolean,
    onDeposit: Boolean
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('User', schema);
