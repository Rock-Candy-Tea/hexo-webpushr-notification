# hexo-webpushr-notification

本仓库/插件 内容根据 **[原仓库](https://github.com/glazec/hexo-web-push-notification)** 进行修改，感谢原作者 **[@glazec](https://github.com/glazec)**。如果使用有问题或者好的想法，欢迎PR，因为本人是菜鸡！

## 注意

> 0.2.0 版本即将发布，与最新版本无较大差异，待逻辑测试没问题后发布版本
若您从旧版本升级至最新版本，请注意查看配置项变更
主要是 `action_buttons` 及 `delay` 的配置

当文章头设置 `webpushr: false` 时，可关闭本篇文章推送，此参数主要防止久远文章更新推送

目前的代码未对字符串长度做限制及，具体可[前往官方文档查看](https://docs.webpushr.com/send-push-to-a-segment)，但我们一般不会超过这些限制，主要是注意 `文章描述/链接` 不要超过 `255` 字符串，其余参数 `文章标题，按钮标题/链接等` 不要超过 `100` 字符串

## 安装

![node-current](https://img.shields.io/node/v/hexo?label=%E6%8E%A8%E8%8D%90&logo=node.js&style=for-the-badge)

为方便后续更新，推荐使用 `npm` 以插件形式安装

[![npm version](https://img.shields.io/npm/v/hexo-webpushr-notification?color=red&logo=npm)](https://www.npmjs.com/package/hexo-webpushr-notification/v/latest) [![npm (beta)](https://img.shields.io/npm/v/hexo-webpushr-notification/beta?logo=npm)](https://www.npmjs.com/package/hexo-webpushr-notification/v/beta) [![npm download](https://img.shields.io/npm/dw/hexo-webpushr-notification?logo=npm)](https://www.npmjs.com/package/hexo-webpushr-notification)

正式版

```bash
npm i hexo-webpushr-notification
```

测试版

```bash
npm i hexo-webpushr-notification@beta
```

当还未经测试时，会在GitHub优先提交及发布 Beta 版本，您Fork修改后也可尝试此种方式测试

[![GitHub package.json version](https://img.shields.io/github/package-json/v/Rock-Candy-Tea/hexo-webpushr-notification?color=brightgreen&label=github&logo=github)](https://github.com/Rock-Candy-Tea/hexo-webpushr-notification) [![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Rock-Candy-Tea/hexo-webpushr-notification?include_prereleases&logo=github)](https://github.com/Rock-Candy-Tea/hexo-webpushr-notification/releases) [![GitHub last commit](https://img.shields.io/github/last-commit/Rock-Candy-Tea/hexo-webpushr-notification?logo=github)](https://github.com/Rock-Candy-Tea/hexo-webpushr-notification)

```bash
npm i github:Rock-Candy-Tea/hexo-webpushr-notification
```

## 使用

如果你想了解推送效果，或者如何获取`key`可前往博客查看[文档](https://blog.ccknbc.cc/posts/hexo-webpushr-notification/)，否则建议您直接优先选择查看`GitHub`配置，因为博客配置内容不会及时更新

## 配置

在hexo配置文件`_config.yml`粘贴如下内容，并按需配置

```yaml
webpushr:
  enable: true

  webpushrKey: "webpushrKey"
  webpushrAuthToken: "webpushrAuthToken"
  # 出于安全考虑，建议将上述两个重要参数添加至系统全局环境变量，并删除或注释掉此处配置
  # 否则可在网页端向访问者或订阅用户发送推送 https://www.webpushr.com/api-playground
  # 例如GitHub Actions环境变量配置，参数名不变，密钥名自定义，可参考如下
  # env:
  #     webpushrKey: ${{ secrets.WEBPUSHR_KEY }}
  #     webpushrAuthToken: ${{ secrets.WEBPUSHR_AUTH_TOKEN }}
  # 如果您的仓库私有，则无需担心此问题

  trackingCode: "trackingCode"
  icon: "https://.../192.png" # 必须为 HTTPS 以及 192*192 png图片
  # auto_hide: false # 默认为 1，代表true，即自动隐藏
  # sort: "date" # 默认为updated，即只要最新文章更改了更新时间即推送新文章，改为date即文章第一次发布时间
  # delay: "0" # 延时推送，考虑到CDN缓存更新，默认定时为在 hexo d 10分钟后推送，单位为分钟（最短延时为5分钟，设置 0 则会立即推送）
  # expire: "15d" # 推送过期时长，默认值为7天，格式如下：'5m'代表5分钟,'5h'代表5小时, '5d'代表5天.
  # image: # 默认为文章封面，Front-matter 属性为'cover'(butterfly主题友好选项)，如果您没有定义默认封面或此属性，请在这里设置默认image
  action_buttons: # 如果你需要额外自定义按钮 可按照如下格式：
    - title: 阅读全文 # 当 title 未配置时 默认值为 “前往查看”
      # url:  # 当 url 未配置时 默认值为 最新文章链接
    - title: 订阅页面
      url: https://blog.ccknbc.cc/sub/
    # 当 action_buttons 未定义时也默认保留了一个“前往查看”按钮，除非设置为 false
    # action_buttons: false # 当设为 false 则不显示额外的按钮，因为隐藏按钮即为当前文章链接

  # 以下配置为按订阅主题推送给不同订阅用户，请按照数组形式，一一对应，具体位置请看使用文档
  categories: [工作, 博客, 工具, 生活, 音乐, 学习]
  segment: ["484223", "484224", "484225", "484226", "484227", "484229"]
  endpoint: segment # 可选配置 all / segment / sid
  # 默认为 segment，即根据不同主题推送细分，同时配置上述选项
  # 例如 all，即推送至所有用户；针对本地测试，建议只推送给单个用户即自己，同时设置下方的 sid 值
  # 您也可以将segment 设置为 all-users 对应的ID，同样也可以实现推送至所有用户
  sid: "119810055" # 单个用户ID 可在控制台查看 https://app.webpushr.com/subscribers

  # 此外，在文章 Front-Matter 处
  # 可覆盖 auto_hide 和 expire 配置，针对需要特别提醒文章可以设置不自动隐藏及过期时间延长等操作
  # 以及可指定schedule参数（例如：schedule: 2022-10-01 00:00:00），定时推送
  # 当文章头设置 webpushr: false 时，可关闭本篇文章推送，此参数主要防止久远文章更改更新时间后自动推送
```

## 额外配置

因官方sw脚本注册后，我们无法注册自己的sw脚本，但官方提供了配置，方便我们使用sw的缓存，拦截请求等功能

需要在配置项中额外添加`sw_self: true`配置，开启自行注册sw（默认用户不用管或者设为`false`）

```yaml
webpushr:
  sw_self: true
```

另外，你还需要在你的脚本文件（例如sw.js）中引入

```js
importScripts('https://cdn.webpushr.com/sw-server.min.js');
```

完成这些你就可以自行注册你的sw脚本了

如果你需要了解如何编写或者注册service worker脚本，可以参考以下文章或项目

[hexo-swpp](https://kmar.top/posts/73014407/) | [Service Worker](https://blog.cyfan.top/p/c0af86bb.html) | [Client Worker](https://clientworker.js.org/) | [Workbox](https://github.com/GoogleChrome/workbox)
