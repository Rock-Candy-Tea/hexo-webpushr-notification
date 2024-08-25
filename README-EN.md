# hexo-webpushr-notification

This repository/plugin content is modified based on the **[original repository](https://github.com/glazec/hexo-web-push-notification)**. Thanks to the original author **[@glazec](https://github.com/glazec)**.

<center>

[中文文档](/README.md) | [English](/README-EN.md)

</center>

## Notice ##

> If you are upgrading from an older version to the latest version, please check for configuration changes and simplifications.

1. The main change is that the `action_buttons` configuration is more customizable, but you can continue to use the original configuration method.
2. When the article header is set to `webpushr: false`, push notifications for that article can be disabled. This parameter is mainly to prevent updates to old articles from being pushed.
3. The current code does not limit string lengths. For specifics, see the [official documentation](https://docs.webpushr.com/send-push-to-a-segment). Generally, we will not exceed these limits. Note that `article description/link` should not exceed `255` characters, and other parameters like `article title, button title/link` should not exceed `100` characters.

## Installation ##

![node-current-hexo](https://img.shields.io/node/v/hexo?label=Hexo%20Requirements&logo=node.js&style=for-the-badge) ![node-current](https://img.shields.io/node/v/hexo-webpushr-notification?label=Plugin%20Recommendations&logo=node.js&style=for-the-badge)

To facilitate future updates, it is recommended to use `NPM` to install as a plugin.

[![npm version](https://img.shields.io/npm/v/hexo-webpushr-notification?color=red&logo=npm)](https://www.npmjs.com/package/hexo-webpushr-notification/v/latest) [![npm (beta)](https://img.shields.io/npm/v/hexo-webpushr-notification/beta?logo=npm)](https://www.npmjs.com/package/hexo-webpushr-notification/v/beta) [![npm download](https://img.shields.io/npm/dw/hexo-webpushr-notification?logo=npm)](https://www.npmjs.com/package/hexo-webpushr-notification)

### Stable Version ###

```bash
npm i hexo-webpushr-notification
```

### Neta Version ###

```bash
npm i hexo-webpushr-notification@beta
```

When untested, Beta versions will be submitted and released on GitHub first. You can Fork and modify for testing.

[![GitHub package.json version](https://img.shields.io/github/package-json/v/Rock-Candy-Tea/hexo-webpushr-notification?color=brightgreen&label=github&logo=github)](https://github.com/Rock-Candy-Tea/hexo-webpushr-notification) [![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Rock-Candy-Tea/hexo-webpushr-notification?include_prereleases&logo=github)](https://github.com/Rock-Candy-Tea/hexo-webpushr-notification/releases) [![GitHub last commit](https://img.shields.io/github/last-commit/Rock-Candy-Tea/hexo-webpushr-notification?logo=github)](https://github.com/Rock-Candy-Tea/hexo-webpushr-notification)

```bash
npm i github:Rock-Candy-Tea/hexo-webpushr-notification
```

## Usage ##

If you want to understand the push effect or how to get the key, you can check the documentation on the blog. Otherwise, it is recommended to directly check GitHub or NPM for configurations, as the blog content may not be updated timely.

## Configuration ##

Paste the following content into the Hexo configuration file `_config.yml` and configure as needed.

```yaml

Copy code
webpushr:
  enable: true

  webpushrKey: "webpushrKey"
  webpushrAuthToken: "webpushrAuthToken"
  # For security reasons, it is recommended to add the above two important parameters to the system global environment variables, and delete or comment out this configuration.
  # Otherwise, you can send pushes to visitors or subscribers on the webpage https://www.webpushr.com/api-playground
  # For example, GitHub Actions environment variable configuration, the parameter names remain unchanged, the key names can be customized, as shown below
  # env:
  #     webpushrKey: ${{ secrets.WEBPUSHR_KEY }}
  #     webpushrAuthToken: ${{ secrets.WEBPUSHR_AUTH_TOKEN }}
  # If your repository is private, you do not need to worry about this issue.

  trackingCode: "trackingCode"
  icon: "https://.../192.png" # Must be HTTPS and a 192*192 png image.
  # auto_hide: false # Defaults to 1, meaning true, which is auto-hide.
  # sort: "date" # Defaults to updated, meaning that only when the latest article updates the time will it push new articles. Change to date for the first publication time of the article.
  # delay: "0" # Delayed push, considering CDN cache updates. The default timing is to push 10 minutes after hexo d, in minutes (the shortest delay is 5 minutes, set to 0 for immediate push).
  # expire: "15d" # Push expiration duration, the default value is 7 days, formatted as follows: '5m' for 5 minutes, '5h' for 5 hours, '5d' for 5 days.
  # image: # Defaults to the article cover, Front-matter attribute is 'cover' (Butterfly theme friendly option). If you do not define a default cover or this attribute, set the default image here.
  action_buttons: # If you need extra custom buttons, configure them as follows:
    - title: Read More # When the title is not configured, the default value is "Go to View".
      # url:  # When the url is not configured, the default value is the latest article link.
    - title: Subscription Page
      url: https://blog.ccknbc.cc/sub/
    # When action_buttons is not defined, a "Go to View" button is retained by default, unless set to false.
    # action_buttons: false # Set to false to not display additional buttons, as hiding the buttons will link to the current article.
    # It is not recommended to configure more than three buttons, as only the first three will be displayed.

  # The following configuration pushes to different subscribers by topic. Please configure as an array, corresponding one by one. See the usage documentation for specific locations.
  categories: [Work, Blog, Tools, Life, Music, Study]
  segment: ["484223", "484224", "484225", "484226", "484227", "484229"]
  endpoint: segment # Optional configuration: all / segment / sid
  # Defaults to segment, meaning push by topic while configuring the above options.
  # For example, all pushes to all users; for local testing, it is recommended to push only to a single user, namely yourself, and set the sid value below.
  # You can also set segment to the ID corresponding to all-users, which also achieves pushing to all users.
  sid: "119810055" # Single user ID can be viewed in the console https://app.webpushr.com/subscribers

  # Additionally, in the Front-Matter of the article:
  # Can override auto_hide and expire configurations. For particularly important articles, set to not auto-hide and extend expiration.
  # Can also specify the schedule parameter (e.g., schedule: 2022-10-01 00:00:00) for scheduled push.
  # When the article header is set to webpushr: false, push for that article can be disabled. This parameter is mainly to prevent updates to old articles from being automatically pushed.
```

## Additional Configuration ##

Due to the official sw script registration, we cannot register our own sw scripts. However, the official configuration allows us to use sw caching, intercept requests, and other functions.

You need to add the sw_self: true configuration in the configuration options to enable self-registered sw (default is for users not to care or set to false).

```yaml
webpushr:
  sw_self: true
```

Additionally, you need to import the following into your script file (e.g., sw.js):

```js
importScripts("https://cdn.webpushr.com/sw-server.min.js");
```

After completing this, you can register your own sw script.

If you need to learn how to write or register service worker scripts, refer to the following articles or projects:

[hexo-swpp](https://kmar.top/posts/73014407/) | [Service Worker](https://blog.cyfan.top/p/c0af86bb.html) | [Client Worker](https://clientworker.js.org/) | [Workbox](https://github.com/GoogleChrome/workbox)

## Custom Modifications ##

You can also customize and modify the webpushr.js file, then install

```bash
npm i axios
```
