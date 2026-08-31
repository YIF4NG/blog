如果你最近注册过 Google Workspace，可能会发现一个比较有意思的地方：

**Google Workspace 在开户时可以直接购买域名，而且某些地区显示的 .com / .net 域名价格明显低于普通域名注册商。**

例如目前网上比较多人讨论的土耳其地区定价中，部分常见后缀曾显示为：

**75 TRY / 年**

这个价格相比 Cloudflare、NameSilo、Namecheap 等常见注册商的 .com 正常价格要低不少。

不过需要先说明一点：

**Google 本身已经不经营 Google Domains。通过 Google Workspace 购买的域名，现在实际由 Squarespace Domains 提供注册服务。**

Google 官方目前仍明确提供这条购买渠道：注册 Google Workspace 或 Cloud Identity Premium 时，如果没有域名，可以直接选择购买新域名，由 Google 帮你通过合作伙伴 Squarespace 完成注册。

下面记录一下完整流程。

---

## 一、这是什么原理？

这并不是什么特殊的“Google Domains 复活”方法。

目前的关系大致是：

```text
你
↓
Google Workspace
↓
Squarespace Domains
↓
域名注册局
```

你是在 **Google Workspace 注册流程中下单**，但是实际 Registrar（注册商）是 **Squarespace Domains**。

Google 会帮你自动完成一部分配置，例如：

- 创建域名注册订单
- 配置 Google Workspace
- 自动配置 Gmail 所需 MX 记录
- 在 Google Admin 中管理域名续费
- 提供进入 Squarespace DNS 管理后台的入口

与此同时，域名依然是你的，你仍然拥有完整的 DNS 管理权限。Google 官方也明确说明，通过这种方式购买的域名可以修改 DNS，并连接到其他网站服务。

所以你完全可以拿它来：

- 部署 Cloudflare Pages
- 部署个人博客
- 解析到 VPS
- 使用 GitHub Pages
- 使用 Vercel
- 使用 Cloudflare DNS
- 搭建自己的邮箱

并不是只能拿来使用 Google Workspace。

---

# 二、为什么会这么便宜？

关键在于：

## Google Workspace 的域名价格存在地区差异

目前网上流传比较多的是 **土耳其地区价格**。

有用户在 Google Workspace 注册过程中看到：

```text
.com      75 TRY / 年
.net      75 TRY / 年
部分其他后缀也有类似价格
```

2026 年仍然有人报告自己的相关域名以 **75 TRY** 的价格续费，因此这并不仅仅是最初注册时出现过的一次性价格。

不过这里一定要注意：

**75 TRY 并不是 Google 官方承诺的全球固定价格。**

域名最终价格可能受到以下因素影响：

- Google Workspace 结算国家/地区
- 域名后缀
- 域名是否属于 Premium Domain
- Squarespace / 注册局调价
- Google 地区定价调整
- 税费

因此应该始终以结账页面显示的：

> Estimated yearly bill

或者实际的 **Domain Registration** 年费为准。

如果结账页面显示的是 75 TRY / 年，那么真正有参考意义的是这个订单价格，而不是网上几个月前的截图。

---

# 三、准备工作

购买之前建议准备：

### 1. 一个 Google 账号

普通 Google 账号即可。

### 2. 可以进行国际支付的银行卡

需要使用实体visa或Mastercard

实测招行万事达可以，bybit万事达不行

### 3. 一个准备注册的域名

例如：

```text
yourname.com
example.net
myblog.org
```

建议提前准备几个名字，因为你喜欢的 .com 很可能已经被注册。

---

# 四、注册 Google Workspace

[打开 Google Workspace 注册页面](https://workspace.google.com)，选择开始试用。


随后 Google 会询问：

选择设置账号的方式

这里选择：

获取新的自定义域名

---

# 五、搜索域名

接下来输入你准备注册的名字。

例如：

```text
yifang
```

Google 会自动搜索：

```text
yifang.com
yifang.net
yifang.org
……
```

如果域名可以注册，就会在旁边显示价格。

这里建议重点观察：

```text
域名后缀
首年价格
预计年费
```

如果你看到价格明显比其他注册商便宜，就可以继续。

---

# 六、确认订单

完成 Workspace 基本设置之后，会进入结算页面。

这里订单地址需要一个土耳其地址，可以去Google Map上随便找一个

取消勾选“信用卡或借记卡账单邮寄地址与上述地址相同” 并填写银行卡地址信息

通常可以看到两项不同的订阅：

```text
Google Workspace
Domain Registration
```

这两个是分开的。

比如可能看到：

```text
Google Workspace Business Starter
按月收费

Domain Registration
75 TRY / year
```
Workspace Business Starter订阅需要取消，否则在14天试用期后会自动续费

---

# 七、一定要验证 Squarespace 邮件

域名购买完成后，等待几分钟应该会收到一封域名联系人验证邮件。

虽然域名是通过 Google Workspace 下单的，但是 Registrar 是：

## Squarespace Domains

因此验证邮件可能来自 Squarespace。

一定要点击邮件中的验证链接。

Google 官方特别提醒：

**域名购买后必须在 15 天内验证注册联系人邮箱，否则 Registrar 必须暂停域名。

如果域名被暂停：

- 网站打不开
- DNS 可能停止正常解析
- Gmail 企业邮箱也可能无法收发邮件

所以这一步千万不要忘。

---

# 八、在哪里管理域名？

购买完成之后进入：

```text
Google Admin Console
```

然后进入：

```text
Account
→ Domains
→ Manage domains
```

找到刚刚购买的域名。

点击：

```text
View details
```

可以看到当前域名注册商以及相关信息。

如果需要管理 DNS，可以进入：

```text
Advanced DNS settings
```

然后进入 Squarespace 的域名管理界面。

Google 官方给出的域名管理流程也是如此。

---

# 九、接入 Cloudflare 

可以。

这个域名本质上就是一个正常的 Squarespace 注册域名。

你可以：

```text
Google Workspace / Squarespace
        ↓
修改 Nameserver
        ↓
Cloudflare
        ↓
Cloudflare DNS
```

然后把域名用于：

```text
Cloudflare Pages
VPS
个人博客
反向代理
Vercel
GitHub Pages
各种自建服务
```

Google Workspace 并不会限制你只能使用 Google 的服务器。

---

# 十、如果我只想要域名，不想长期用 Workspace 呢？

这是很多人最关心的问题。

在 Google Admin 的 Billing 页面中，通常可以看到两个独立项目：

```text
Google Workspace
Domain Registration
```

域名注册和 Workspace 是不同的订阅。

因此如果你不再需要 Workspace，应当处理的是：

```text
Google Workspace subscription
```

而不是：

```text
Domain Registration
```

---

# 十一、取消Google Workspace subscription

[进入订阅管理界面](https://admin.google.com)  注意这里需要用域名邮箱登录

后台存在：

```text
Google Workspace商务标准版
域名注册
```

```text
点击Google Workspace商务标准版->更多->取消订阅
```

---

