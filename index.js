#!/usr/bin/env node

/**
 * CustomeBot launcher script.
 *
 * @author Praful Rana <praful@runnable.com> & Sohail Ahmed <sohail@runnable.com>
 */

require('loadenv')()
const CustomerBot = require('./lib/customerbot')

/**
 * Environment variables used to configure the bot:
 *
 *  APP_NAME : for logging purposes
 *  BIG_POPPA_HOST : hostname to connect to bigPoppa
 *  BOT_API_KEY : the authentication token to allow the bot, https://<yourorganization>.slack.com/services/new/bot
 *  BOT_NAME : the name to use for the bot on Slack
 *  DATADOG_API_KEY : datadog api key
 *  DATADOG_APP_KEY : app key for datadog
 *  GITHUB_ACCESS_TOKEN : for github api requests
 *  INTERCOM_APP_API_KEY : for intercom api requests
 *  INTERCOM_APP_ID : for intercom api requests
 *  JIRA_PASSWORD : for jira api requests
 *  JIRA_USERNAME : for jira api requests
 *  RABBITMQ_HOSTNAME : for ponos
 *  RABBITMQ_PASSWORD : for ponos
 *  RABBITMQ_PORT : for ponos
 *  RABBITMQ_USERNAME : for ponos
 *  STRIPE_SECRET_KEY : for stripe api requests
 */

const customerbot = new CustomerBot()
customerbot.run()
