/* global hexo */
/* eslint no-param-reassign:0, strict:0 */
'use strict';

const util = require('hexo-util');
const fs = require('hexo-fs');
const fetch = require("node-fetch");
var request = require('request');
var moment = require('moment');

if (hexo.config.webpushr.enable){
    // triggered after hexo generate.
    // this output the newPost.json into public/.
    hexo.on('generateAfter', async function () {
        var posts = hexo.locals.get('posts').data
        if(hexo.config.webpushr.sort == 'date' ){
            var updatedSortedPosts = posts.sort(function (a, b) { return b.date - a.date }).map(function (v) { return v });
            var newPost = updatedSortedPosts[0];
        }
        else{
            var updatedSortedPosts = posts.sort(function (a, b) { return b.updated - a.updated }).map(function (v) { return v });
            var newPost = updatedSortedPosts[0];
        };
        // console.log(newPost);
        var JSONFeed = {
            'title': newPost.title,
            'updated': newPost.updated.format() || newPost.date.format(),
            'message': newPost.description || util.stripHTML(newPost.excerpt),
            'path': newPost.path,
            'target_url': newPost.permalink,
            'image': newPost.cover || hexo.config.webpushr.image,
            'tags': newPost.tags.data.map(function (v) {
                return v.name;
            }),
            'categories': newPost.categories.data.map(function (v) {
                return v.name;
            }),
            'schedule': newPost.schedule || moment().add(hexo.config.webpushr.delay || 10, 'minutes'),
            'expire': newPost.expire || hexo.config.webpushr.expire || '7d',
            'auto_hide': newPost.auto_hide || hexo.config.webpushr.auto_hide || '1',
        };
        // console.log(JSONFeed);
        fs.writeFile(
            "public/newPost.json",
            JSON.stringify(JSONFeed),
            );
        hexo.log.info("已自动生成: newPost.json");
    });

    //insert webpushr-sw.js to web root dir
    if (hexo.config.webpushr.sw_self == (false || null || undefined))
        {
        hexo.on("generateAfter", async function () {
            await fs.writeFile(
                "public/webpushr-sw.js",
                "importScripts('https://cdn.webpushr.com/sw-server.min.js');",
            );
            hexo.log.info("已自动生成: webpushr-sw.js");
        });
    };

    //insert webpushr tracking code

    if (hexo.config.webpushr.sw_self == true){
        hexo.extend.filter.register('after_render:html', data => {
            var payload = `(function (w, d, s, id) {
                if (typeof (w.webpushr) !== 'undefined') return; w.webpushr = w.webpushr || function () { (w.webpushr.q = w.webpushr.q || []).push(arguments) }; var js, fjs = d.getElementsByTagName(s)[0]; js = d.createElement(s); js.id = id; js.async = 1; js.src = "https://cdn.webpushr.com/app.min.js";fjs.parentNode.appendChild(js);}(window, document, 'script', 'webpushr-jssdk'));webpushr('setup', { 'key': '${hexo.config.webpushr.trackingCode}', 'sw': 'none' });`
            // return data.replace(/<body>(?!<\/body>).+?<\/body>/s, str => str.replace('</body>', "<script>"+decodeURI(payload)+"</script></body>"));
            return data.replace(/<body.+?>(?!<\/body>).+?<\/body>/s, str => str.replace('</body>', "<script>" + decodeURI(payload) + "</script></body>"));
        });
    }

    else {
        hexo.extend.filter.register('after_render:html', data => {
            var payload = `(function (w, d, s, id) {
                if (typeof (w.webpushr) !== 'undefined') return; w.webpushr = w.webpushr || function () { (w.webpushr.q = w.webpushr.q || []).push(arguments) }; var js, fjs = d.getElementsByTagName(s)[0]; js = d.createElement(s); js.id = id; js.async = 1; js.src = "https://cdn.webpushr.com/app.min.js";fjs.parentNode.appendChild(js);}(window, document, 'script', 'webpushr-jssdk'));webpushr('setup', { 'key': '${hexo.config.webpushr.trackingCode}' });`
            // return data.replace(/<body>(?!<\/body>).+?<\/body>/s, str => str.replace('</body>', "<script>"+decodeURI(payload)+"</script></body>"));
            return data.replace(/<body.+?>(?!<\/body>).+?<\/body>/s, str => str.replace('</body>', "<script>" + decodeURI(payload) + "</script></body>"));
        });
    }


    //triggered after hexo deploy.
    //it compare the newPost.json from your site and local to decide whether push the notification.
    hexo.on("deployAfter", async function () {
        hexo.log.info("正在获取 本地 与 在线 文章信息");
        // Get newPost.json from your site.
        var newPostOnlineSite = async () => {
            try {
                var result = await fetch(hexo.config.url + "/newPost.json",
                    {
                    headers: {
                        "Accept": "application/json"
                    }
            })
                return result.json()
            } catch (e) {
                return result = await JSON.parse(JSON.stringify(
                    {}
                ))
            }
        }
        newPostOnlineSite = await newPostOnlineSite();
        newPostOnlineSite = await JSON.parse(JSON.stringify(newPostOnlineSite));
        if(newPostOnlineSite.updated == (null || undefined)){
            hexo.log.warn('获取在线版本 "newPost.json" 失败，可能为首次推送更新或站点无法访问，已跳过本次推送');
        }
        else{
            // Get newPost.json from your local.
            var newPostLocal = await fs.readFileSync("public/newPost.json");
            // Get newPost.json from local
            newPostLocal = await JSON.parse(newPostLocal);
            // console.table({
            //     "在线版本": newPostOnlineSite,
            //     "本地版本": newPostLocal
            // });

            var endpoint = hexo.config.webpushr.endpoint || 'segment'
            if ((endpoint == 'segment' && (hexo.config.webpushr.categories && hexo.config.webpushr.segment) !== (null || undefined))){
                hexo.log.info("正在比较文章分类是否满足分类条件");
                var topic = new Array(newPostLocal.categories.length)
                for (var i = 0; i < topic.length; i++) {
                    topic[i] = hexo.config.webpushr.categories.indexOf(newPostLocal.categories[i])
                    topic[i] = hexo.config.webpushr.segment[topic[i]];
                }
            }
            else if((endpoint == 'segment' && (hexo.config.webpushr.categories && hexo.config.webpushr.segment) == (null || undefined))){
                hexo.log.error('默认为按主题推送，需配置categories及segment');
            }

            //determine whether to push web notification
            if(topic == (null || undefined) && endpoint == 'segment'){
                hexo.log.info('未发现指定分类，已跳过本次推送');
            }
            else if(newPostOnlineSite.updated == newPostLocal.updated){
                hexo.log.info("最新文章更新时间无更改，已跳过本次推送");
            }
            else if(newPostOnlineSite.updated !== newPostLocal.updated){
                // push new Post notification
                if(hexo.config.webpushr.delay == '0')
                    {
                        var payload = {
                            title: newPostLocal.title,
                            message: newPostLocal.message,
                            target_url: newPostLocal.target_url,
                            image: newPostLocal.image,
                            icon: hexo.config.webpushr.icon,
                            auto_hide: newPostLocal.auto_hide,
                            expire_push: newPostLocal.expire,
                            segment: topic,
                            sid: hexo.config.webpushr.sid,
                            action_buttons: [{"title": "前往查看", "url": newPostLocal.target_url},hexo.config.webpushr.action_buttons[0] || {"title": "前往查看", "url": newPostLocal.target_url}]
                        };
                    }
                else if(hexo.config.webpushr.action_buttons == false)
                    {
                        var payload = {
                            title: newPostLocal.title,
                            message: newPostLocal.message,
                            target_url: newPostLocal.target_url,
                            image: newPostLocal.image,
                            icon: hexo.config.webpushr.icon,
                            auto_hide: newPostLocal.auto_hide,
                            send_at: moment(newPostLocal.schedule).format(),
                            expire_push: newPostLocal.expire,
                            segment: topic,
                            sid: hexo.config.webpushr.sid
                        };
                    }
                else if(hexo.config.webpushr.delay == '0' && hexo.config.webpushr.action_buttons == false)
                    {
                        var payload = {
                            title: newPostLocal.title,
                            message: newPostLocal.message,
                            target_url: newPostLocal.target_url,
                            image: newPostLocal.image,
                            icon: hexo.config.webpushr.icon,
                            auto_hide: newPostLocal.auto_hide,
                            expire_push: newPostLocal.expire,
                            segment: topic,
                            sid: hexo.config.webpushr.sid
                        };
                    }
                else
                    {
                        var payload = {
                            title: newPostLocal.title,
                            message: newPostLocal.message,
                            target_url: newPostLocal.target_url,
                            image: newPostLocal.image,
                            icon: hexo.config.webpushr.icon,
                            auto_hide: newPostLocal.auto_hide,
                            send_at: moment(newPostLocal.schedule).format(),
                            expire_push: newPostLocal.expire,
                            segment: topic,
                            sid: hexo.config.webpushr.sid,
                            action_buttons: [{"title": "前往查看", "url": newPostLocal.target_url},hexo.config.webpushr.action_buttons[0] || {"title": "前往查看", "url": newPostLocal.target_url}]
                        };
                    }
                hexo.log.info("正在推送文章更新，请稍等", "\n", "以下是推送内容", payload);
                var headers = {
                    webpushrKey: process.env.webpushrKey || hexo.config.webpushr.webpushrKey,
                    webpushrAuthToken: process.env.webpushrAuthToken || hexo.config.webpushr.webpushrAuthToken,
                    "Content-Type": "application/json"
                };
                // console.log(headers);
                var options = {
                    url: 'https://api.webpushr.com/v1/notification/send/' + endpoint,
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                };
                // console.log(options);
                function callback(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        hexo.log.info("《"+newPostLocal.title+"》 推送更新成功", "\n", "以下是接口返回信息", "\n", body);
                    }
                    else {
                        hexo.log.error("《"+newPostLocal.title+"》 推送更新失败", "\n", "以下是接口返回信息", "\n", body);
                    }
                }
                request(options, callback);
            }
        }
    });
}