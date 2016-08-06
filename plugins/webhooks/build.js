'use strict';

const Models = require('screwdriver-models');
const boom = require('boom');
const schema = require('screwdriver-data-schema');
const buildWebhookSchema = schema.api.webhooks.build;

/**
 * Build Webhook Plugin
 *  - Updates the Meta, Status, and Stop Time of a given build
 * @method build
 * @param  {Hapi.Server}    server
 * @param  {String}         options.password  Login password
 * @param  {Function}       next
 */
module.exports = (server, options) => {
    // Do some silly setup of stuff
    const build = new Models.Build(
        server.settings.app.datastore,
        server.settings.app.executor,
        options.password
    );

    // Now use it
    return {
        method: 'POST',
        path: '/webhooks/build',
        config: {
            description: 'Handle events from Launcher',
            notes: 'Updates the status of the build',
            tags: ['api', 'build', 'webhook'],
            auth: {
                strategies: ['token'],
                scope: ['build']
            },
            handler: (request, reply) => {
                const id = request.auth.credentials.username;
                const status = request.payload.status;
                const data = {
                    status
                };

                request.log(['webhook-build', id], `Received status update to ${status}`);

                if (['SUCCESS', 'FAILURE', 'ABORTED'].indexOf(status) > -1) {
                    data.meta = request.payload.meta || {};
                    data.endTime = Date.now();
                }

                build.update({ id, data }, (err) => {
                    if (err) {
                        return reply(boom.wrap(err));
                    }

                    return reply().code(204);
                });
            },
            validate: {
                payload: buildWebhookSchema
            }
        }
    };
};
