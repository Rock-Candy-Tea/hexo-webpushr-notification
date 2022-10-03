# hexo-webpushr-notification

## 文档还没写

[Example site](https://blog.ccknbc.cc)

## Install

```js
npm i hexo-webpushr-notification --save
```

## Usage

Add the configuration to `_config.yml` in hexo root dir.

```yml
webpushr:
  # webpushrKey：出于安全考虑，请添加至系统环境变量
  # webpushrAuthToken：出于安全考虑，请添加至系统环境变量
  trackingCode: "BB9Y-w9p3u0CKA7UP9nupB6I-_NqE2MuODmKJjyC4W2YflX06Ff_hEhrNJfonrut5l6gCa28gC83q2OII7Qv-oA"
  icon: "https://gcore.jsdelivr.net/gh/ccknbc-backup/cdn/image/pwa/192.png" # 必须为192*192 png图片
  # auto_hide: "0" # 默认为 1，代表true，即自动隐藏
  # sort: "date" # 默认为updated，即只要最新文章更改了更新时间即推送新文章，改为date即发布时间
  # delay: "30" # 默认定时为在 hexo d十分钟后推送，单位为分钟
  # image: # 默认为文章封面，Front-matter 属性为'cover'(butterfly主题友好选项)，如果您没有定义默认封面或此属性，请在这里设置默认image
  action_buttons: # ，默认第一个按钮为前往查看文章，您可也替换第二个按钮相关属性，因参数需求限制（本人太菜）否则将显示两个前往查看按钮
    [
      {
        "title": "状态页面",
        "url": "https://cc.instatus.com"
      }
    ]
  # 以下配置为按订阅主题推送给不同订阅用户，请按照数组形式，一一对应
  categories: [工作, 博客, 工具, 生活, 音乐, 学习]
  segment: ["484223", "484224", "484225", "484226", "484227", "484229"]
```

The `trackingCode` is a little bit harder to find. Go to your webpushr site dashboard, and go to Setup>TrackingCode. The tracking code look like this:

```js
<!-- start webpushr tracking code -->
<script>(function(w,d, s, id) {if(typeof(w.webpushr)!=='undefined') return;w.webpushr=w.webpushr||function(){(w.webpushr.q=w.webpushr.q||[]).push(arguments)};var js, fjs = d.getElementsByTagName(s)[0];js = d.createElement(s); js.id = id;js.async=1;js.src = "https://cdn.webpushr.com/app.min.js";
fjs.parentNode.appendChild(js);}(window,document, 'script', 'webpushr-jssdk'));
webpushr('setup',{'key':'BKOlpbdgvBCWXqXI6PtsUzobY7TLV9gwJU8bzMktrwfrSERg_xnLvbjpdw8x2GmFmi1ZcLTz0ni6OnX5MAwoM58' });</script>
<!-- end webpushr tracking code -->
```

`AEGlpbdgvBCWXqXI6PtsUzobY7TLV9gwJU8bzMktrwfrSERg_xnLVbjpCw8x2GmFmi1ZcLTz0ni6OnX5MAwoM88` in the last line is your `trackingCode`.

The webpushrKey and webpushrAuthToken can be found in Integration>REST API Keys.

**notice**: The ask-for-notification prompt will not appear locally. This means you will not see any ask-for-notification prompt when running `hexo server`

## Customize

You can customize how your ask-for-notification prompt look like in Setup>EditCustom Prompts.

## How it works

The plugin generates `newPost.json` during `hexo generate`. The `newPost.json` contains the information of latest post. It looks like this:

```json
{
  "title": "Auto web push notification",
  "date": "02/24/2020",
  "updated": "02/24/2020",
  "description": "如何自动通知读者有更新了？即只要正常更新博客，读者便可以在第一时间收到关于新文章的通知。",
  "cover": "https://....jpg",
  "tags": ["hexo", "push notifications", "自动化", "CI"],
  "categories": ["开发"]
}
```

When you call `hexo deploy`, the plugin will compare the `newPost.json` from your online site and from your local machine. If the id values are different, the plugin will trigger the push notification from [webPush](https://www.webpushr.com/).


The roadmap needs your feedbacks. Feel free to open the issue.
