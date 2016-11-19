#!/usr/bin/env node

/**
 * CustomeBot launcher script.
 *
 * @author Praful Rana <praful@runnable.com> & Sohail Ahmed <sohail@runnable.com>
 */

require('loadenv')()
import CustomerBot from './lib/customerbot'

/**
 * Environment variables used to configure the bot:
 *
 *  BOT_API_KEY : the authentication token to allow the bot to connect to your slack organization. You can get your
 *      token at the following url: https://<yourorganization>.slack.com/services/new/bot (Mandatory)
 *
 *  BOT_NAME : the name to use for the bot on Slack
 */

const customerbot = new CustomerBot()
customerbot.run()
