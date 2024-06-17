'use strict';

const util = require('hexo-util');
const fs = require('hexo-fs');
const moment = require('moment');
const axios = require('axios');
const config = hexo.config.webpushr

const endpoint = config.endpoint || 'segment';
let newPostOnlineSite;
let topic = [];
let actionButtons = [];

if (config.enable) {
    // Sort to get the latest article information and write it locally.
    hexo.on('generateAfter', async () => {
        const posts = hexo.locals.get('posts').data;
        const sortBy = config.sort === 'date' ? 'date' : 'updated';
        const updatedSortedPosts = posts.sort((a, b) => b[sortBy] - a[sortBy]);
        const newPost = updatedSortedPosts[0];
        if (sortBy === 'date') newPost.updated = newPost.date;

        const JSONFeed = {
            title: newPost.title,
            updated: newPost.updated.format(),
            message: newPost.description || util.stripHTML(newPost.excerpt),
            target_url: newPost.permalink,
            image: newPost.cover || config.image,
            categories: newPost.categories.data.map(v => v.name),
            schedule: newPost.schedule || moment().add(config.delay || 10, 'minutes'),
            expire: newPost.expire || config.expire || '7d',
            auto_hide: newPost.auto_hide || config.auto_hide || '1',
            webpushr: newPost.webpushr
        };
        fs.writeFile('public/newPost.json', JSON.stringify(JSONFeed));
    });

    // Automatically generate webpushr-sw.js file
    if (!config.sw_self) {
        hexo.on('generateAfter', async () => {
            await fs.writeFile('public/webpushr-sw.js', 'importScripts("https://cdn.webpushr.com/sw-server.min.js");');
        });
    }

    // Insert code after generating html
    hexo.extend.filter.register('after_render:html', data => {
        var swOption = (config.sw_self == true) ? "'none'" : "undefined";

        var payload = `(function (w, d, s, id) {
        if (typeof (w.webpushr) !== 'undefined') return;
        w.webpushr = w.webpushr || function () { (w.webpushr.q = w.webpushr.q || []).push(arguments) };
        var js, fjs = d.getElementsByTagName(s)[0];
        js = d.createElement(s);
        js.id = id;
        js.async = 1;
        js.src = "https://cdn.webpushr.com/app.min.js";
        fjs.parentNode.appendChild(js);
        }(window, document, 'script', 'webpushr-jssdk'));

        webpushr('setup', {
        'key': '${config.trackingCode}',
        'sw': ${swOption}
        });
        `;
        
        return data;
        // disabled the functionality to add the javascript at the end delegating that functionality to a consent manager 
        //return data.replace(/<body.+?>(?!<\/body>).+?<\/body>/s, str => str.replace('</body>', `<script>${decodeURI(payload)}</script></body>`));
    });

    // Get online newPost.json (old version) before deploying
    hexo.on("deployBefore", async () => {
        hexo.log.info('hexo-webpushr-notification: Getting the latest online article information');
        newPostOnlineSite = async () => {
            try {
                var result = await axios.get(`${hexo.config.url}/newPost.json`, {
                    headers: { Accept: 'application/json' }
                });
                return result.data;
            } catch (e) {
                return result = await JSON.parse(JSON.stringify(
                    {}
                ))
            }
        };
    });

    // After deployment, read the local and online version information obtained before deployment.
    hexo.on('deployAfter', async () => {
        var newPostLocal = await fs.readFileSync('public/newPost.json');
        newPostLocal = JSON.parse(newPostLocal);
        if (!newPostLocal) {
            hexo.log.error('hexo-webpushr-notification: Failed to obtain the local version "newPost.json".');
            return false;
        }
        newPostOnlineSite = await newPostOnlineSite();
        newPostOnlineSite = await JSON.parse(JSON.stringify(newPostOnlineSite));
        if (!newPostOnlineSite) {
            hexo.log.error('hexo-webpushr-notification: Failed to obtain the online version "newPost.json".');
            return false;
        }

        // Determine whether the article category belongs to the topic
        function isValidPostCategory() {
            if (endpoint == 'segment' && config.categories && config.segment) {
                for (var i = 0; i < newPostLocal.categories.length; i++) {
                    topic[i] = config.categories.indexOf(newPostLocal.categories[i]);
                    if (topic[i] === -1) {
                        return false;
                    }
                    topic[i] = config.segment[topic[i]];
                }
            }
            return true;
        }

        /**
         * Determine whether push notifications are needed
         *
         * @returns {boolean} Do you need to push
         */
        function shouldPushNotification() {
            if (newPostLocal.webpushr === false) {
                hexo.log.info('hexo-webpushr-notification: This article is configured not to be pushed and has been skipped.');
                return false;
            }

            if (endpoint === 'sid' && !config.sid) {
                hexo.log.error('hexo-webpushr-notification: No specific sid is configured');
                return false;
            }

            if (endpoint == 'segment' && !config.categories && !config.segment) {
                hexo.log.error('hexo-webpushr-notification: The default is to push by topic, categories and segments need to be configured');
                return false;
            }

            if (endpoint === 'segment' && !isValidPostCategory()) {
                hexo.log.info('hexo-webpushr-notification: The classification conditions are not met and this push has been skipped.');
                return false;
            }

            if (newPostOnlineSite.updated == newPostLocal.updated) {
                hexo.log.info('hexo-webpushr-notification: The article has not been updated and this push has been skipped');
                return false;
            }

            hexo.log.info('hexo-webpushr-notification: Article update detected, prepare push notification');
            return true;
        }

        // When conditions are met, update notifications are pushed
        if (shouldPushNotification()) {
            const headers = {
                webpushrKey: process.env.webpushrKey || config.webpushrKey,
                webpushrAuthToken: process.env.webpushrAuthToken || config.webpushrAuthToken,
                "Content-Type": "application/json"
            };

            if (config.action_buttons && Array.isArray(config.action_buttons)) {
                config.action_buttons.forEach(function (button) {
                    actionButtons.push({
                        title: button.title || 'Go to view',
                        url: button.url || newPostLocal.target_url
                    });
                });
            } else {
                actionButtons.push({
                    title: 'Go to view',
                    url: newPostLocal.target_url
                });
            }

            if (actionButtons.length > 3) {
                // hexo.log.warn('hexo-webpushr-notification: Tip: It is not recommended that you configure too many buttons');
                // hexo.log.info('hexo-webpushr-notification: The first 3 buttons have been intercepted this time, and it is recommended that you modify your configuration');
                actionButtons = actionButtons.slice(0, 3);
            }

            const payloadTemplate = {
                name: newPostLocal.title,
                title: newPostLocal.title,
                message: newPostLocal.message,
                target_url: newPostLocal.target_url,
                image: newPostLocal.image,
                icon: config.icon,
                auto_hide: newPostLocal.auto_hide,
                expire_push: newPostLocal.expire,
                action_buttons: actionButtons,
            };

            const delay = config.delay;

            let payload = { ...payloadTemplate }

            if (endpoint == 'segment') {
                payload.segment = topic
            };

            if (config.sid) {
                payload.sid = config.sid
                delete payload.image
            };

            if (actionButtons == false) {
                delete payload.action_buttons
            };

            if (delay == '0' && !actionButtons) {
                delete payload.action_buttons
            } else {
                payload.send_at = moment(newPostLocal.schedule).format()
            };

            hexo.log.info('hexo-webpushr-notification: The article update is being pushed, please wait.');
            hexo.log.info('hexo-webpushr-notification: The following is the push content:', payload);

            axios.post(`https://api.webpushr.com/v1/notification/send/${endpoint}`, payload, { headers })
                .then(res => {
                    hexo.log.info(`《${newPostLocal.title}》Push update successfully!`);
                    // hexo.log.info('hexo-webpushr-notification: The following is the interface return information:', res.data);
                })
                .catch(err => {
                    hexo.log.error(`《${newPostLocal.title}》Failed to push update!`);
                    //hexo.log.error('hexo-webpushr-notification: The following is the interface return information', err.response.data);
                });
        }
    });
}