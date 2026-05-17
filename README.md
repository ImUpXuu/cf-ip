# cf-ip
A simple code to get IP information powered by Cloudflare Worker.
# IP Info API - Cloudflare Worker

基于 Cloudflare Worker 的 IP 信息查询 API，利用 `request.cf` 内置对象获取访问者的 IP 地址、地理位置、时区、ASN 等完整信息。**不依赖任何外部 API，全部由 Cloudflare 边缘节点提供。**

## 功能特性

- 获取当前请求客户端的完整 IP 信息（IP、国家、城市、经纬度、时区、ASN 等）
- 支持查询任意指定 IP 的详细信息
- 支持 CORS 跨域请求
- 可选 Token 鉴权保护
- 返回格式为 JSON，支持格式化输出
- 轻量级，无第三方依赖

## 配置项

在 [worker.js](worker.js) 文件顶部可修改：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CORS` | 是否开启跨域支持 | `true` |
| `BASE_URL` | 基础 API 路径 | `/ipapi` |
| `TOKEN_ENABLED` | 是否开启 Token 验证 | `false` |
| `TOKEN` | 验证用的 Token 值 | `your-token-here` |

## Token 验证

当 `TOKEN_ENABLED` 设为 `true` 时，所有请求需携带 `token` 参数：

```
/ipapi?token=your-token-here
/ipapi/ip?ip=1.2.3.4&token=your-token-here
```

Token 不匹配或缺失时返回 `401 Invalid token`。关闭时无需带此参数，直接访问即可。

---

## API 接口

### 基础 URL

部署后你的 Worker 域名，例如：`https://your-worker.your-subdomain.workers.dev`

### 1. 获取当前客户端 IP 信息

获取访问者的 IP 地址以及 Cloudflare 提供的所有请求属性。

**请求：**

```http
GET /ipapi
```

**响应示例：**

```json
{
  "ip": "149.28.159.222",
  "country": "SG",
  "city": "Singapore",
  "continent": "AS",
  "latitude": "1.3215",
  "longitude": "103.6957",
  "timezone": "Asia/Singapore",
  "postalCode": "627753",
  "regionCode": "",
  "asn": 20473,
  "asOrganization": "Vultr Holdings, LLC",
  "colo": "SIN",
  "httpProtocol": "HTTP/2",
  "tlsVersion": "TLSv1.3",
  "tlsCipher": "AEAD-AES128-GCM-SHA256"
}
```

> **说明：** 返回字段由 Cloudflare 自动提供，不同地区和网络环境可能略有差异。

### 2. 查询指定 IP 的信息

通过参数查询指定 IP 的信息。利用自请求机制，将目标 IP 注入 `CF-Connecting-IP` 头，让 Workers 运行时自动填充对应的 `request.cf` 数据。

**请求：**

```http
GET /ipapi/ip?ip=8.8.8.8
```

**响应示例：**

```json
{
  "ip": "8.8.8.8",
  "country": "US",
  "city": "Ashburn",
  "continent": "NA",
  "latitude": "39.03",
  "longitude": "-77.5",
  "timezone": "America/New_York",
  "asn": 15169,
  "asOrganization": "Google LLC",
  "colo": "IAD"
}
```

---

## 错误响应

### 400 Bad Request

缺少必需的 `ip` 参数：

```json
{ "error": "Missing ip parameter" }
```

### 401 Unauthorized

Token 验证失败：

```json
{ "error": "Invalid token" }
```

### 404 Not Found

访问不存在的路径：

```json
{ "error": "Not Found" }
```

---

## 返回字段说明

以下为 `request.cf` 对象返回的所有字段及含义：

### 地理位置信息

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `ip` | string | 客户端真实 IP 地址 | `"149.28.159.222"` |
| `country` | string | 国家代码 (ISO 3166-1 alpha-2) | `"SG"`, `"CN"`, `"US"` |
| `city` | string | 城市名称 | `"Singapore"`, `"Shanghai"` |
| `continent` | string | 大洲代码 | `"AS"`, `"NA"`, `"EU"` |
| `latitude` | string | 纬度坐标 | `"1.3215"` |
| `longitude` | string | 经度坐标 | `"103.6957"` |
| `timezone` | string | 时区标识 | `"Asia/Singapore"` |
| `postalCode` | string | 邮政编码 | `"627753"`, `"200000"` |
| `regionCode` | string | 地区/省份缩写 | `"SH"`, `"CA"` |
| `isEUCountry` | boolean | 是否位于欧盟境内 | `false` |

### 网络属性

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `asn` | number | 自治系统号码 (AS Number) | `20473` |
| `asOrganization` | string | ASN 所属组织名称 | `"Vultr Holdings, LLC"` |
| `colo` | string | 处理请求的 Cloudflare 数据中心代码 | `"SIN"`, `"PVG"`, `"NRT"` |

常用数据中心代码：SIN(新加坡)、PVG(上海)、HKG(香港)、NRT(东京)、LAX(洛杉矶)、IAD(弗吉尼亚)

### HTTP 协议信息

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `httpProtocol` | string | 客户端使用的 HTTP 协议版本 | `"HTTP/2"`, `"HTTP/3"` |
| `clientAcceptEncoding` | string | 客户端支持的编码方式 | `"gzip, deflate, br"` |
| `requestPriority` | string | HTTP/2 请求优先级 | `"weight=256;exclusive=1"` |
| `edgeRequestKeepAliveStatus` | number | 边缘连接保活状态 | `1` |

### TLS / 加密信息

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `tlsVersion` | string | TLS 协议版本 | `"TLSv1.3"` |
| `tlsCipher` | string | 使用的加密套件 | `"AEAD-AES128-GCM-SHA256"` |
| `tlsClientRandom` | string | TLS 握手客户端随机数（Base64） | `"DFE7..."` |
| `tlsClientCiphersSha1` | string | 客户端支持的密码套件 SHA1 摘要 | `"sQ7e..."` |
| `tlsClientExtensionsSha1` | string | TLS 扩展 SHA1 摘要 | `"7jbx..."` |
| `tlsClientExtensionsSha1Le` | string | TLS 扩展 LE 版本 SHA1 摘要 | `"S3AC..."` |
| `tlsClientHelloLength` | string | Client Hello 报文长度 | `"2026"` |
| `tlsExportedAuthenticator` | object | 导出的认证器握手摘要 | 见下方子字段 |

#### tlsExportedAuthenticator 子字段

| 字段 | 说明 |
|------|------|
| `clientHandshake` | 客户端握手摘要 |
| `serverHandshake` | 服务端握手摘要 |
| `clientFinished` | 客户端 Finished 消息摘要 |
| `serverFinished` | 服务端 Finished 消息摘要 |

### TLS 客户端证书信息 (tlsClientAuth)

当客户端使用证书认证时的证书详情，未使用时各字段为空字符串或 `0`/`false`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `certPresented` | string | 是否提供了证书 (`"0"` 或 `"1"`) |
| `certVerified` | string | 证书验证状态 (`"NONE"` / `"SUCCESS"` / `"FAILED"`) |
| `certRevoked` | string | 证书是否已被吊销 |
| `certIssuerDN` | string | 证书颁发者 DN |
| `certSubjectDN` | string | 证书主题 DN |
| `certIssuerDNRFC2253` | string | RFC2253 格式的颁发者 DN |
| `certSubjectDNRFC2253` | string | RFC2253 格式的主题 DN |
| `certIssuerDNLegacy` | string | Legacy 格式颁发者 DN |
| `certSubjectDNLegacy` | string | Legacy 格式主题 DN |
| `certSerial` | string | 证书序列号 |
| `certIssuerSerial` | string | 颁发者+序列号组合 |
| `certSKI` | string | 证书主体密钥标识符 |
| `certIssuerSKI` | string | 颁发者密钥标识符 |
| `certFingerprintSHA1` | string | 证书 SHA1 指纹 |
| `certFingerprintSHA256` | string | 证书 SHA256 指纹 |
| `certNotBefore` | string | 证书生效时间 |
| `certNotAfter` | string | 证书过期时间 |
| `certRFC9440` | string | RFC9440 证书透明度信息 |
| `certRFC9440TooLarge` | boolean | RFC9440 数据是否过大 |
| `certChainRFC9440` | string | 证书链 RFC9440 信息 |
| `certChainRFC9440TooLarge` | boolean | 证书链 RFC9440 数据是否过大 |

### 网络质量指标

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `clientTcpRtt` | number | 客户端 TCP 往返时间 (ms) | `1` |
| `clientQuicRtt` | number | 客户端 QUIC 往返时间 (ms) | `0` |

### 机器人检测

| 字段 | 类型 | 说明 |
|------|------|------|
| `verifiedBotCategory` | string | 已验证机器人分类（如 Googlebot 等），空字符串表示非已验证机器人 |

### 边缘层信息

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `requestHeaderNames` | object | 请求头名称集合（通常为空） | `{}` |
| `edgeL4.deliveryRate` | number | 边缘 L4 层传输速率 (bytes/s) | `911264` |

---

## 部署指南

### 方法一：通过 Cloudflare Dashboard 部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击左侧菜单 **Workers & Pages**
3. 点击 **创建应用程序** → **创建 Worker**
4. 给 Worker 命名，点击 **部署**
5. 点击 **编辑代码**
6. 将 [worker.js](worker.js) 代码复制粘贴到编辑器中
7. 根据需要修改顶部配置项
8. 点击 **保存并部署**

### 方法二：通过 Wrangler CLI 部署

1. 安装 Wrangler CLI：

```bash
npm install -g wrangler
```

2. 登录 Cloudflare 账号：

```bash
wrangler login
```

3. 创建项目目录：

```bash
mkdir ipapi-worker && cd ipapi-worker
```

4. 创建 `wrangler.toml` 配置文件：

```toml
name = "ipapi-worker"
main = "worker.js"
compatibility_date = "2024-01-01"
```

5. 将 [worker.js](worker.js) 放入项目根目录

6. 部署：

```bash
wrangler deploy
```

## 注意事项

- 本地开发时（如 `wrangler dev`），`request.cf` 可能仅包含模拟数据或不完整，部署到 Cloudflare 后才能获取完整真实数据
- 所有字段均可能为 `undefined` 或缺失，取决于请求来源和网络环境
- 经纬度精度有限（约 10-50 公里范围），不可用于高精度定位
- 仅当域名通过 Cloudflare 代理（橙色云朵）时，`request.cf` 才包含完整地理信息
