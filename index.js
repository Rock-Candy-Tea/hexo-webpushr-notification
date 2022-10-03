/* global hexo */
/* eslint no-param-reassign:0, strict:0 */
'use strict';

var fs = require('hexo-fs');
var url = require("url")
var request = require('request');
var moment = require('moment');

// triggered after hexo generate.
// this output the newPost.json into public/.
hexo.on('generateAfter', async function (post) {
    var posts = hexo.locals.get('posts').data
    if(hexo.config.webpushr.sort == 'date' ){
        var dateSortedPosts = posts.sort(function (a, b) { return b.date - a.date }).map(function (v) { return v })
        var newPost = dateSortedPosts[0]
        var JSONFeed = {
            'title': newPost.title,
            'updated': newPost.date.format('L'),
            'message': newPost.description,
            'path': newPost.path,
            'target_url': newPost.permalink,
            'image': newPost.cover,
            'tags': newPost.tags.data.map(function (v) {
                return v.name;
            }),
            'categories': newPost.categories.data.map(function (v) {
                return v.name;
            }),
            'auto_hide': hexo.config.webpushr.auto_hide || '1',
        }}
    else{
        var updatedSortedPosts = posts.sort(function (a, b) { return b.updated - a.updated }).map(function (v) { return v })
        var newPost = updatedSortedPosts[0]
        var JSONFeed = {
            'title': newPost.title,
            'updated': newPost.updated.format('L'),
            'message': newPost.description,
            'path': newPost.path,
            'target_url': newPost.permalink,
            'image': newPost.cover,
            'tags': newPost.tags.data.map(function (v) {
                return v.name;
            }),
            'categories': newPost.categories.data.map(function (v) {
                return v.name;
            }),
            'auto_hide': hexo.config.webpushr.auto_hide || '1',
        }};
    fs.writeFile(
        "public/newPost.json",
        JSON.stringify(JSONFeed),
        );
        hexo.log.info("已自动生成: newPost.json");
});

//triggered before hexo deploy.
//it compare the newPost.json from your site and local to decide whether push the notification.
hexo.on("deployAfter", async function (post) {
    // Get newPost.json from your site.
    var newPostOnlineSite = await fetch(url.resolve(hexo.config.url, "newPost.json"));
    var newPostOnlineSite = await newPostOnlineSite.json();
    newPostOnlineSite = JSON.parse(JSON.stringify(newPostOnlineSite));
    // Get newPost.json from your local.
    var newPostLocal = await fs.readFileSync("public/newPost.json");
    // Get newPost.json from local
    newPostLocal = JSON.parse(newPostLocal);
    // console.table({
    //     "From online site": newPostOnlineSite,
    //     "From Local": newPostLocal
    // });

    var topic = new Array(newPostLocal.categories.length)
    for (var i = 0; i < topic.length; i++) {
        topic[i] = hexo.config.webpushr.categories.indexOf(newPostLocal.categories[i])
        topic[i] = hexo.config.webpushr.segment[topic[i]];
    }
    if(topic[0] == null) console.log('未发现指定分类，跳过本次推送');
    else{
        //determine whether to push web notification
        if (newPostOnlineSite.updated != (newPostLocal.updated  && null)) {
            // push new Post notification
            var payload = {
                title: newPostLocal.title,
                message: newPostLocal.message,
                target_url: newPostLocal.target_url,
                image: newPostLocal.image || hexo.config.webpushr.image,
                icon: hexo.config.webpushr.icon,
                auto_hide: newPostLocal.auto_hide,
                send_at: moment().add(hexo.config.webpushr.delay || 10, 'minutes').format(),
                segment: topic,
                action_buttons: [{"title": "前往查看", "url": newPostLocal.target_url},hexo.config.webpushr.action_buttons[0] || {"title": "前往查看", "url": newPostLocal.target_url}]
            };
            console.log(payload);
            var headers = {
                webpushrKey: process.env.webpushrKey,
                webpushrAuthToken: process.env.webpushrAuthToken,
                "Content-Type": "application/json"
            };
            var options = {
                url: 'https://api.webpushr.com/v1/notification/send/segment',
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            };
            function callback(error, response, body) {
                if (!error && response.statusCode == 200) {
                    hexo.log.info("《"+newPostLocal.title+"》 推送更新成功");
                    hexo.log.info(body);
                }
                else {
                    hexo.log.error("《"+newPostLocal.title+"》 推送更新失败");
                    hexo.log.error(body);
                }
            }
            request(options, callback);

        } else {
            hexo.log.info("无文章更新");
        }
    }});

//insert webpushr tracking code
hexo.extend.filter.register('after_render:html', data => {
    var payload = `(function (w, d, s, id) {
            if (typeof (w.webpushr) !== 'undefined') return; w.webpushr = w.webpushr || function () { (w.webpushr.q = w.webpushr.q || []).push(arguments) }; var js, fjs = d.getElementsByTagName(s)[0]; js = d.createElement(s); js.id = id; js.async = 1; js.src = "https://cdn.webpushr.com/app.min.js";fjs.parentNode.appendChild(js);}(window, document, 'script', 'webpushr-jssdk'));webpushr('setup', { 'key': '${hexo.config.webpushr.trackingCode}' });`

    // return data.replace(/<body>(?!<\/body>).+?<\/body>/s, str => str.replace('</body>', "<script>"+decodeURI(payload)+"</script></body>"));
    return data.replace(/<body.+?>(?!<\/body>).+?<\/body>/s, str => str.replace('</body>', "<script>" + decodeURI(payload) + "</script></body>"));

});

//insert webpushr-sw.js to web root dir
hexo.on("generateAfter", async function (post) {
    fs.writeFile(
        "public/webpushr-sw.js",
        "importScripts('https://cdn.webpushr.com/sw-server.min.js');",
    );
    hexo.log.info("已自动生成: webpushr-sw.js");
});
