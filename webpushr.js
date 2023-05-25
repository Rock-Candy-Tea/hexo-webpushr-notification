'use strict';

const util = require('hexo-util');
const fs = require('hexo-fs');
const moment = require('moment');
const axios = require('axios');

const endpoint = hexo.config.webpushr.endpoint || 'segment';
let newPostOnlineSite;
let topic = [];
let actionButtons = [];

if (hexo.config.webpushr.enable) {
    // 生成后排序获得最新文章，并写入本地 newPost.json
    hexo.on('generateAfter', async () => {
        const posts = hexo.locals.get('posts').data;
        const sortBy = hexo.config.webpushr.sort === 'date' ? 'date' : 'updated';
        const updatedSortedPosts = posts.sort((a, b) => b[sortBy] - a[sortBy]);
        const newPost = updatedSortedPosts[0];
        if (sortBy === 'date') newPost.updated = newPost.date;

        const JSONFeed = {
            title: newPost.title,
            updated: newPost.updated.format(),
            message: newPost.description || util.stripHTML(newPost.excerpt),
            target_url: newPost.permalink,
            image: newPost.cover || hexo.config.webpushr.image,
            categories: newPost.categories.data.map(v => v.name),
            schedule: newPost.schedule || moment().add(hexo.config.webpushr.delay || 10, 'minutes'),
            expire: newPost.expire || hexo.config.webpushr.expire || '7d',
            auto_hide: newPost.auto_hide || hexo.config.webpushr.auto_hide || '1',
            webpushr: newPost.webpushr
        };
        fs.writeFile('public/newPost.json', JSON.stringify(JSONFeed));
    });

    if (!hexo.config.webpushr.sw_self) {
        hexo.on('generateAfter', async () => {
            await fs.writeFile('public/webpushr-sw.js', 'importScripts("https://cdn.webpushr.com/sw-server.min.js");');
            hexo.log.info('已自动生成: webpushr-sw.js');
        });
    }
}

// 生成 html 后插入代码
hexo.extend.filter.register('after_render:html', data => {
    const { sw_self, trackingCode } = hexo.config.webpushr;
    const sw = sw_self ? 'none' : '';
    const payload = `(() => {
            if (typeof (w.webpushr) !== 'undefined') return;
            w.webpushr = w.webpushr || function () { (w.webpushr.q = w.webpushr.q || []).push(arguments) };
            var js, fjs = d.getElementsByTagName(s)[0];
            js = d.createElement(s); js.id = id; js.async = 1;
            js.src = "https://cdn.webpushr.com/app.min.js";
            fjs.parentNode.appendChild(js);
            })();
            webpushr('setup', { 'key': '${trackingCode}', 'sw': '${sw}' });`;
    return data.replace(/(<body.+?>).+?(<\/body>)/s, (str, p1, p2) => {
        return p1 + '<script>' + payload + '</script>' + p2;
    });
});

// 部署前获取在线 newPost.json（旧版本）
hexo.on("deployBefore", async () => {
    hexo.log.info('正在获取 在线 文章信息');
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

hexo.on('deployAfter', async () => {
    // 部署后读取本地和部署前获取到的在线版本 newPost.json
    var newPostLocal = await fs.readFileSync('public/newPost.json');
    newPostLocal = JSON.parse(newPostLocal);
    if (!newPostLocal) {
        hexo.log.warn('获取本地版本 "newPost.json" 失败，可能为未生成文件或读取超时');
        return false;
    }
    newPostOnlineSite = await newPostOnlineSite();
    newPostOnlineSite = await JSON.parse(JSON.stringify(newPostOnlineSite));
    if (!newPostOnlineSite) {
        hexo.log.warn('获取在线版本 "newPost.json" 失败，可能为首次推送更新或站点无法访问');
        return false;
    }
    // console.log('本地版本 \n', newPostLocal);
    // console.log('在线版本 \n', newPostOnlineSite);

    // 判断文章分类是否属于主题
    function isValidPostCategory() {
        if (endpoint !== 'all' && hexo.config.webpushr.categories && hexo.config.webpushr.segment) {
            for (var i = 0; i < newPostLocal.categories.length; i++) {
                topic[i] = hexo.config.webpushr.categories.indexOf(newPostLocal.categories[i]);
                if (topic[i] === -1) {
                    return false;
                }
                topic[i] = hexo.config.webpushr.segment[topic[i]];
            }
        }
        return true;
    }

    /**
     * 判断是否需要推送通知
     *
     * @returns {boolean} 是否需要推送
     */
    function shouldPushNotification() {
        if (endpoint !== 'all' && !hexo.config.webpushr.categories && !hexo.config.webpushr.segment) {
            hexo.log.error('默认为按主题推送,需配置categories及segment');
            return false;
        }

        if (endpoint === 'sid' && !hexo.config.webpushr.sid) {
            hexo.log.error('未配置具体 sid');
            return false;
        }

        if (newPostLocal.webpushr === false) {
            hexo.log.info('本文章配置为不推送,已跳过');
            return false;
        }

        if (newPostOnlineSite.updated == newPostLocal.updated) {
            hexo.log.info('文章无更新,已跳过本次推送');
            return false;
        }

        if (!isValidPostCategory()) {
            hexo.log.info('未满足分类条件,已跳过本次推送');
            return false;
        }

        if (newPostOnlineSite.updated !== newPostLocal.updated) {
            hexo.log.info('检测到文章更新,准备推送通知');
            return true;
        }

        hexo.log.error('含有未考虑到的情况，默认为不推送');
        return false;
    }

    // 满足条件，推送更新通知
    if (shouldPushNotification()) {
        const headers = {
            webpushrKey: process.env.webpushrKey || hexo.config.webpushr.webpushrKey,
            webpushrAuthToken: process.env.webpushrAuthToken || hexo.config.webpushr.webpushrAuthToken,
            "Content-Type": "application/json"
        };

        if (hexo.config.webpushr.action_buttons && Array.isArray(hexo.config.webpushr.action_buttons)) {
            hexo.config.webpushr.action_buttons.forEach(function (button) {
                actionButtons.push({
                    title: button.title || '前往查看',
                    url: button.url || newPostLocal.target_url
                });
            });
        } else {
            actionButtons.push({
                title: '前往查看',
                url: newPostLocal.target_url
            });
        }

        if (actionButtons.length > 3) {
            hexo.log.warn('提示: Webpushr 消息推送最多允许 3 个 Action Buttons \n 本次已取前 3 个按钮，但请检查并修改您的配置');
            actionButtons = actionButtons.slice(0, 3);
        }

        const payloadTemplate = {
            title: newPostLocal.title,
            message: newPostLocal.message,
            target_url: newPostLocal.target_url,
            image: newPostLocal.image,
            icon: hexo.config.webpushr.icon,
            auto_hide: newPostLocal.auto_hide,
            expire_push: newPostLocal.expire,
            segment: topic,
            action_buttons: actionButtons,
        };

        const delay = hexo.config.webpushr.delay;

        let payload = { ...payloadTemplate }

        if (hexo.config.webpushr.sid) {
            payload.sid = hexo.config.webpushr.sid
        };

        if (actionButtons == false) {
            delete payload.action_buttons
        };

        if (delay == '0' && !actionButtons) {
            delete payload.action_buttons
        } else {
            payload.send_at = moment(newPostLocal.schedule).format()
        };

        hexo.log.info('正在推送文章更新,请稍后');
        hexo.log.info('以下是推送内容:', payload);

        axios.post(`https://api.webpushr.com/v1/notification/send/${endpoint}`, payload, { headers })
            .then(res => {
                hexo.log.info(`《${newPostLocal.title}》推送更新成功!`);
                hexo.log.info('以下是接口返回信息:', res.data);
            })
            .catch(err => {
                hexo.log.error(`《${newPostLocal.title}》推送更新失败!`);
                hexo.log.error('以下是接口返回信息:', err.response.data);
            });
    }
});