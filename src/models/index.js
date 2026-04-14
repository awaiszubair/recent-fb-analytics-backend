const Partner = require('./Partner');
const ConnectedPage = require('./ConnectedPage');
const Post = require('./Post');
const PageInsights = require('./PageInsights');
const PostInsights = require('./PostInsights');
const Earnings = require('./Earnings');
const ThirdPartyData = require('./ThirdPartyData');
const SyncJob = require('./SyncJob');

/**
 * Centralized models export
 * Links all functional database wrappers
 */
module.exports = {
  Partner,
  ConnectedPage,
  Post,
  PageInsights,
  PostInsights,
  Earnings,
  ThirdPartyData,
  SyncJob
};
